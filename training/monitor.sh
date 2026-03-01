#!/bin/bash
# Training Progress Monitor for Lumen Studio
# Outputs JSON status for easy parsing

DATASETS_DIR="$HOME/training/datasets"
OUTPUTS_DIR="$HOME/training/outputs"

# Count images per category
echo "{"
echo "  \"timestamp\": \"$(date -Iseconds)\","
echo "  \"categories\": {"

first=true
total=0
for cat in food portrait product automotive architecture landscape wedding fashion; do
    count=$(find "$DATASETS_DIR/$cat" -name "*.jpg" 2>/dev/null | wc -l)
    total=$((total + count))
    if [ "$first" = true ]; then
        first=false
    else
        echo ","
    fi
    echo -n "    \"$cat\": $count"
done

echo ""
echo "  },"
echo "  \"total_images\": $total,"

# Check if training is running
if screen -ls | grep -q training; then
    echo "  \"pipeline_status\": \"running\","
else
    echo "  \"pipeline_status\": \"stopped\","
fi

# Check for completed LoRAs
lora_count=$(find "$OUTPUTS_DIR" -name "*.safetensors" 2>/dev/null | wc -l)
echo "  \"loras_completed\": $lora_count,"

# Disk usage
disk_used=$(du -sh "$DATASETS_DIR" 2>/dev/null | cut -f1)
echo "  \"disk_usage\": \"$disk_used\""

echo "}"
