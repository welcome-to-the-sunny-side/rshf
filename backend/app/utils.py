import hashlib, os, base64, json
from app.database import Base, engine

def reset_db():
    print("dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("all tables dropped.")

    print("creating tables from models...")
    Base.metadata.create_all(bind=engine)
    print("schema rebuilt.")


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    h = hashlib.sha256(salt + password.encode()).digest()
    return base64.b64encode(salt + h).decode()

def verify_password(password: str, hashed: str) -> bool:
    data = base64.b64decode(hashed.encode())
    salt, true_hash = data[:16], data[16:]
    test_hash = hashlib.sha256(salt + password.encode()).digest()
    return test_hash == true_hash


def extract_code_from_ipynb(ipynb_path: str) -> str:
    """
    Extracts and concatenates all code from a Jupyter notebook (.ipynb) file.
    
    Args:
        ipynb_path: Path to the .ipynb file
        
    Returns:
        A string containing all the code cells' content concatenated together
    """
    with open(ipynb_path, 'r', encoding='utf-8') as f:
        notebook = json.load(f)
    
    code_cells = []
    for cell in notebook.get('cells', []):
        if cell.get('cell_type') == 'code':
            # Get source content (could be a list of strings or a single string)
            source = cell.get('source', [])
            if isinstance(source, list):
                code_cells.append(''.join(source))
            else:
                code_cells.append(source)
    
    # Join all code cells with newlines to ensure proper separation
    complete_code = '\n\n'.join(code_cells)
    return complete_code
