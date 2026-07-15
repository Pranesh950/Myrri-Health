#!/bin/bash
MAX_RUNS=${1:-10}
echo "🤖 Starting Freebuff Ralph Wiggum loop for $MAX_RUNS iterations..."
for i in $(seq 1 $MAX_RUNS); do
  echo "----------------------------------------"
  echo "🔄 Iteration $i of $MAX_RUNS"
  echo "----------------------------------------"
  # Reads plan.md and passes the text directly to the freebuff execution session
  cat plan.md | freebuff
  sleep 2
done
echo "✅ Loop finished!"
