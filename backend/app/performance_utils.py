"""
Performance tracking utilities for measuring function execution time and memory usage.
"""
from __future__ import annotations

import time
import logging
import functools
import tracemalloc
from typing import Callable, Any, TypeVar, cast
logger = logging.getLogger("performance")

F = TypeVar('F', bound=Callable[..., Any])

def track_performance(func: F) -> F:
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        func_name = func.__qualname__

        # don't really need this, it just makes the logs undreadable
        # logger.info(f"ENTERING function {func_name}") 
        start_time = time.time()
        tracemalloc.start()
        
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            execution_time = time.time() - start_time

            if peak > 5 * 1024 * 1024:
                logger.info(
                    f"HIGH MEMORY USAGE: {func_name}: "
                    f"Current Memory={current/(1024 * 1024 ):.2f}MB, "
                    f"Peak Memory={peak/(1024 * 1024):.2f}MB"
                )

            if execution_time > 0.5:
                logger.info(
                    f"TIME BOTTLENECK: {func_name}, "
                    f"ExecutionTime={execution_time:.4f}s, "
                )
            
            # logger.info(
            #     f"PERFORMANCE {func_name}: "
            #     f"Time={execution_time:.4f}s, "
            #     f"Current Memory={current/1024:.2f}KB, "
            #     f"Peak Memory={peak/1024:.2f}KB"
            # )
    
    return cast(F, wrapper)
