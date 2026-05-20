"""
Fay booter stub for headless microservice mode.
Provides the feiFei global reference needed by stream_manager and other modules.

The feiFei instance is set by main.py after Fay core initialization.
"""
feiFei = None
DeviceInputListenerDict = {}  # Empty in headless mode (no remote audio)

def is_running():
    return feiFei is not None

def start():
    pass  # Managed by main.py

def stop():
    pass  # Managed by main.py
