#!/bin/bash

# Find all Node.js processes listening on ports and kill them
echo "Finding and killing all Node.js processes listening on ports..."
NODE_PIDS=$(lsof -i -P | grep LISTEN | grep node | awk '{print $2}')

if [ -n "$NODE_PIDS" ]; then
  echo "Killing Node.js processes with PIDs: $NODE_PIDS"
  kill -9 $NODE_PIDS
  echo "All Node.js server processes have been terminated."
else
  echo "No Node.js processes found listening on ports."
fi

# For good measure, try to kill any processes on common Next.js ports
for port in {3000..3010}; do
  PIDS=$(lsof -t -i:$port 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "Killing processes on port $port: $PIDS"
    kill -9 $PIDS 2>/dev/null
  fi
done

echo "Done cleaning up ports." 