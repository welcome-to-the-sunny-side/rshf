import os
import uvicorn

if __name__ == "__main__":
    # Get port from environment variable, default to 8000 if not set
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting server on port {port}...")
    
    # Run the application with explicit host and port
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=port,
        log_level="info",
        # Prevent reload in production
        reload=False
    )
