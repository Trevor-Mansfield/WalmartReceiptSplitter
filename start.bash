#!/bin/bash

echo "Reminder: Make sure docker is running!"

/git-bash.exe -c "./start_backend_server.bash" &
backend_pid=$!

sleep 1s
/git-bash.exe -c "./start_backend_worker.bash" &
worker_pid=$!

sleep 1s
/git-bash.exe -c "./start_client_server.bash" &
client_pid=$!

echo "Press any key to stop."
read -n 1 -s -r

for process_pid in $worker_pid $backend_pid $client_pid; do
  kill -INT $process_pid
  wait $process_pid 2>/dev/null
done
