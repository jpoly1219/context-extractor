#!/bin/bash

# Set the path to the backup folder
backup_folder="backup"

run_name="$1"

# Commit and push backup files
# git add "backup"
# git commit -m "create backup"
# git push

# Loop through each subfolder in the testout folder to collect the keys
for subfolder in "$backup_folder"/*/; do
	# Check if the run.data file exists in the subfolder
	if [ -f "$subfolder/run.data" ]; then
		# Get hash of last commit
		hash=$(git rev-parse HEAD | head -n 1 | tr -d "\n")

		# Find and replace commit line
		sed -i "s/commit:/commit:$hash/" "$subfolder/run.data"
	fi
done

# Commit new collated_data.csv
cp "${run_name}_collated_data.csv" "${backup_folder}/."
git add "${run_name}_collated_data.csv"
git commit -m "collate data"

# Commit and push edited run.data files
git add "${backup_folder}"
git commit -m "update collated data and commit hash on run.data"
git push

echo "Current snapshot committed with hash: $hash"
