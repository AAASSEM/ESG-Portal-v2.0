# gunicorn.conf.py - Production configuration for ESG Portal
bind = "0.0.0.0:10000"
workers = 2
timeout = 120  # Increase timeout to 120 seconds to prevent worker timeout
worker_class = "sync"
max_requests = 1000
max_requests_jitter = 50
keepalive = 2
preload_app = True
worker_connections = 1000