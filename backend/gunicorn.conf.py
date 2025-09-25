# gunicorn.conf.py
bind = "0.0.0.0:10000"
workers = 2
timeout = 120  # Increase timeout to 120 seconds
worker_class = "sync"
max_requests = 1000
max_requests_jitter = 50
keepalive = 2
preload_app = True