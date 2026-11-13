"""
BMSCE Smart Academic — Timetable Optimizer Service
FastAPI application wrapping greedy + OR-Tools CP-SAT solvers.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from solver.models import OptimizeRequest, OptimizeResponse, HealthResponse
from solver.greedy import run_greedy
from solver.cpsat import run_cpsat
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BMSCE Timetable Optimizer",
    description="Greedy + OR-Tools CP-SAT timetable scheduling engine",
    version="1.0.0",
)

# CORS: allow API server and dev frontend by default; override via CORS_ORIGIN env var in production
_cors_origins_env = os.environ.get("CORS_ORIGIN", "")
_cors_origins: list[str] = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else ["http://localhost:3001", "http://localhost:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="HEALTHY", solver="OR-Tools CP-SAT 9.11", mode="SYNTHETIC_DEMO")


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest):
    """
    Run timetable optimization.
    Returns up to 3 candidate timetables:
      - candidate[0]: Greedy baseline (fast, always feasible)
      - candidate[1]: CP-SAT optimized (best quality, 30s time limit)
      - candidate[2]: CP-SAT with relaxed soft constraints (fallback)
    """
    start = time.time()
    logger.info(f"Optimization request: {len(req.sections)} sections, "
                f"{len(req.subjects)} subjects, {len(req.faculty)} faculty, "
                f"{len(req.rooms)} rooms")

    candidates = []

    # --- Candidate 0: Greedy Baseline ---
    try:
        greedy_result = run_greedy(req)
        candidates.append(greedy_result)
        logger.info(f"Greedy complete: {greedy_result.hard_violations} hard violations, "
                    f"score={greedy_result.objective_score:.1f}")
    except Exception as e:
        logger.error(f"Greedy failed: {e}")
        raise HTTPException(status_code=500, detail=f"Greedy solver failed: {str(e)}")

    # --- Candidate 1: CP-SAT Optimized ---
    try:
        cpsat_result = run_cpsat(req, time_limit_seconds=25, relax_soft=False)
        candidates.append(cpsat_result)
        logger.info(f"CP-SAT complete: status={cpsat_result.solver_status}, "
                    f"score={cpsat_result.objective_score:.1f}")
    except Exception as e:
        logger.warning(f"CP-SAT failed (non-fatal): {e}")
        # CP-SAT failure is non-fatal; greedy is still a valid result

    # --- Candidate 2: CP-SAT Relaxed ---
    if len(candidates) < 2:
        try:
            relaxed_result = run_cpsat(req, time_limit_seconds=15, relax_soft=True)
            relaxed_result.label = "CP-SAT Relaxed"
            candidates.append(relaxed_result)
        except Exception as e:
            logger.warning(f"CP-SAT relaxed failed: {e}")

    elapsed = time.time() - start
    logger.info(f"Optimization complete: {len(candidates)} candidates in {elapsed:.1f}s")

    return OptimizeResponse(
        candidates=candidates,
        elapsed_seconds=round(elapsed, 2),
        feasible=any(c.hard_violations == 0 for c in candidates),
    )

