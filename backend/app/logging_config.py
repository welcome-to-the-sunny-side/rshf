"""
Logging configuration for the application.
"""
import logging
import os
import sys
from pathlib import Path

def setup_logging():
    """
    Configure logging for the application.
    Creates a performance.log file in the logs directory.
    """
    # Create logs directory if it doesn't exist
    logs_dir = Path(__file__).parent.parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Configure formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # File handler for performance logs
    perf_file_handler = logging.FileHandler(logs_dir / "performance.log")
    perf_file_handler.setLevel(logging.INFO)
    perf_file_handler.setFormatter(formatter)
    
    # Configure performance logger specifically
    perf_logger = logging.getLogger("performance")
    perf_logger.setLevel(logging.INFO)
    perf_logger.addHandler(console_handler)
    perf_logger.addHandler(perf_file_handler)
    perf_logger.propagate = False
    
    return perf_logger
