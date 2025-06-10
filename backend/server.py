import os
import uvicorn
import time

if __name__ == "__main__":
    # Get port from environment variable, default to 8000 if not set
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting server on port {port}...")
    print(f"PORT environment variable: {os.getenv('PORT', 'Not set')}")
    print(f"Binding to host: 0.0.0.0 and port: {port}")
    
    # Ensure Render has time to detect the port binding
    time.sleep(5)
    
    # Run the application with explicit host and port
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=port,
        log_level="info",
        # Prevent reload in production
        reload=False
    )
