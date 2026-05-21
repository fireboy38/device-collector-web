#!/bin/bash
while true; do
  cd /home/z/my-project/mini-services/notification-service
  bun index.ts
  echo "[daemon] Service crashed or stopped, restarting in 2s..." >> /tmp/notification-service.log
  sleep 2
done
