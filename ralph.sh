#!/bin/bash
MAX_RUNS=${1:-5}

echo "🤖 Starting Freebuff Ralph Wiggum Improvement Loop ($MAX_RUNS cycles)..."

for i in $(seq 1 $MAX_RUNS); do
  echo "----------------------------------------"
  echo "🔄 Ralph Cycle $i of $MAX_RUNS"
  echo "----------------------------------------"
  
  # Inject instructions directly into the interactive TUI shell, 
  # forcing it to read plan.md, fix a task, and exit cleanly.
  freebuff << INLINE_PROMPT
Read the prompt specs and task backlog inside plan.md. Choose the highest priority uncompleted task. Execute the code changes required to improve it, check your work, update the task status in plan.md to [x], and then type /exit.
/exit
INLINE_PROMPT

  echo "✅ Cycle $i completed. Resetting terminal environment..."
  sleep 3
done

echo "🎉 Ralph Wiggum improvement loop finished!"
