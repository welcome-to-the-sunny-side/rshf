import pandas as pd
from sqlalchemy import inspect, text, MetaData
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager
from app.database import Base, engine, SessionLocal
from app import models
import json
import os
import datetime

def reset_db():
    print("dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("all tables dropped.")

    print("creating tables from models...")
    Base.metadata.create_all(bind=engine)
    print("schema rebuilt.")

def drop_table(table_name: str) -> None:
    """
    Drop a specific table from the database.
    
    Args:
        table_name: The name of the table to drop
        
    Returns:
        None
    """
    metadata = MetaData()
    metadata.reflect(bind=engine)
    
    if table_name in metadata.tables:
        try:
            metadata.tables[table_name].drop(engine)
            print(f"Table '{table_name}' dropped successfully.")
        except Exception as e:
            print(f"Error dropping table '{table_name}': {e}")
    else:
        print(f"Table '{table_name}' does not exist.")


def to_df(table_name: str) -> pd.DataFrame:
    """
    Convert a table to a pandas DataFrame.
    
    Args:
        table_name: The name of the table to convert
        
    Returns:
        pandas DataFrame containing the table data
    """
    try:
        query = f"SELECT * FROM {table_name}"
        df = pd.read_sql_query(query, engine)
        return df
    except Exception as e:
        print(f"Error converting table '{table_name}' to DataFrame: {e}")
        return pd.DataFrame()


def get_table_names() -> list:
    """
    Get all table names in the database.
    
    Returns:
        List of table names
    """
    inspector = inspect(engine)
    return inspector.get_table_names()


def count_records(table_name: str) -> int:
    """
    Count the number of records in a table.
    
    Args:
        table_name: The name of the table to count records for
        
    Returns:
        Number of records in the table
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.scalar()
    except Exception as e:
        print(f"Error counting records in table '{table_name}': {e}")
        return 0


def backup_table(table_name: str, backup_dir: str = "backups") -> str:
    """
    Create a backup of a table as a CSV file.
    
    Args:
        table_name: The name of the table to backup
        backup_dir: The directory to store the backup in (default: 'backups')
        
    Returns:
        Path to the backup file
    """
    try:
        # Create backup directory if it doesn't exist
        os.makedirs(backup_dir, exist_ok=True)
        
        # Get current timestamp for filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(backup_dir, f"{table_name}_{timestamp}.csv")
        
        # Convert table to DataFrame and save as CSV
        df = to_df(table_name)
        df.to_csv(backup_file, index=False)
        
        print(f"Table '{table_name}' backed up to '{backup_file}'")
        return backup_file
    except Exception as e:
        print(f"Error backing up table '{table_name}': {e}")
        return ""


def get_table_schema(table_name: str) -> dict:
    """
    Get the schema of a table.
    
    Args:
        table_name: The name of the table to get the schema for
        
    Returns:
        Dictionary containing column name, type, and nullable status
    """
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        schema = {}
        for column in columns:
            schema[column['name']] = {
                'type': str(column['type']),
                'nullable': column['nullable']
            }
        return schema
    except Exception as e:
        print(f"Error getting schema for table '{table_name}': {e}")
        return {}


@contextmanager
def get_session():
    """
    Context manager for database sessions.
    Ensures sessions are properly closed after use.
    
    Usage:
        with get_session() as session:
            # Use session here
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def execute_raw_query(query: str, params: dict = None, fetch: bool = True) -> list:
    """
    Execute a raw SQL query on the database.
    
    Args:
        query: The SQL query to execute
        params: Parameters to use in the query (default: None)
        fetch: Whether to fetch results (default: True)
        
    Returns:
        List of results if fetch is True, otherwise None
    """
    with get_session() as session:
        try:
            result = session.execute(text(query), params or {})
            if fetch:
                return [dict(row) for row in result]
            session.commit()
            return None
        except Exception as e:
            session.rollback()
            print(f"Error executing query: {e}")
            return []
