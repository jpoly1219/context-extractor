#!/bin/bash

# Constants
run_name=${1:-default}
projectRoot=$(pwd)
log_directory="$projectRoot/starcoder-types-and-headers/testlog"
collate_script="$projectRoot/types_and_headers_collate_data.sh"
take_snapshot="$projectRoot/take_snapshot.sh"
command_prefix="node --env-file=.env src/starcoder-types-and-headers.mjs"
# command_prefix="node src/testrunner-starcoder.mjs"

command_timeout=120
wait_time=0
num_runs=20

# Source folders
# source_folders=(
# 	"/home/jacob/projects/testtslspclient/targets/starcoder-todo/"
# 	"/home/jacob/projects/testtslspclient/targets/starcoder-playlist/"
# 	"/home/jacob/projects/testtslspclient/targets/starcoder-passwords/"
# 	"/home/jacob/projects/testtslspclient/targets/starcoder-booking/"
# 	"/home/jacob/projects/testtslspclient/targets/starcoder-emojipaint/"
# )
source_folders=(
	"$projectRoot/targets/starcoder-todo/"
	"$projectRoot/targets/starcoder-playlist/"
	"$projectRoot/targets/starcoder-passwords/"
	"$projectRoot/targets/starcoder-booking/"
	"$projectRoot/targets/starcoder-emojipaint/"
)

# Optional argument variations
opt_arg_variations=(
	# "--type-constraint false --relevant-ctx false --error_rounds_max 2"
	"--type-constraint false --relevant-ctx false --error_rounds_max 0"
	# "--type-constraint false --relevant-ctx true --error_rounds_max 2"
	"--type-constraint false --relevant-ctx true --error_rounds_max 0"
	# "--type-constraint true --relevant-ctx false --error_rounds_max 2"
	"--type-constraint true --relevant-ctx false --error_rounds_max 0"
	# "--type-constraint true --relevant-ctx true --error_rounds_max 2"
	"--type-constraint true --relevant-ctx true --error_rounds_max 0"
)
# "--type-constraint false --relevant-ctx false"
# "--type-constraint false --relevant-ctx true"
# "--type-constraint true --relevant-ctx false"
# "--type-constraint true --relevant-ctx true"

# Function to display usage information
usage() {
	echo "Usage: $0 [--verbose] [run_name]"
	echo "  --verbose    Display HazeLS output on the terminal in addition to saving in log files"
	echo "  run_name     Name of the test run (default: 'default')"
}

# Check if --verbose flag is provided
verbose=false
while [[ $# -gt 0 ]]; do
	case "$1" in
	--verbose)
		verbose=true
		shift
		;;
	--*)
		echo "Invalid flag: $1"
		usage
		exit 1
		;;
	*)
		run_name=$1
		shift
		;;
	esac
done

# Call the warm_serials script
# bash "$warm_serials"

# Create log directory if it doesn't exist
mkdir -p "$log_directory"

# Function to run the command with given optional arguments and source folder
run_command() {
	opt_args=$1
	source_folder=$2
	source=$(basename ${source_folder})
	run_number=$3
	timestamp=$(date +%Y%m%d_%H%M%S)
	unix_timestamp=$(date +%s)
	log_file="$log_directory/${run_name}-${source}-types-and-headers-${timestamp}.log"

	if $verbose; then
		timeout --foreground "$command_timeout"s bash -c "$command_prefix $timestamp $unix_timestamp --run_name \"$run_name\" $opt_args --source_folder \"$source_folder\" --run_number \"$run_number\" | tee \"$log_file\"" &
	else
		timeout --foreground "$command_timeout"s bash -c "$command_prefix $timestamp $unix_timestamp --run_name \"$run_name\" $opt_args --source_folder \"$source_folder\" --run_number \"$run_number\" > \"$log_file\" 2>&1" &
	fi
	cmd_pid=$!
	wait $cmd_pid
	exit_code=$?

	if [ $exit_code -eq 124 ]; then
		echo "Timeout: command exceeded ${command_timeout} seconds for source '$source_folder' with options '$opt_args'. Log file: $log_file"
		error_count=$((error_count + 1))
		error_summary+="- Timeout: command for source '$source_folder' with options '$opt_args' exceeded ${command_timeout} seconds. Log file: $log_file\n"
	elif [ $exit_code -ne 0 ]; then
		echo "Alert: command exited with non-zero exit code $exit_code. Check log file: $log_file"
		error_count=$((error_count + 1))
		error_summary+="- command with options '$opt_args' for source '$source_folder' exited with code $exit_code. Log file: $log_file\n"
	fi
}

# Initialize a summary string and error tracking variables
summary="Summary of test runs:\n"
error_count=0
error_summary=""

# Iterate over source folders
for source_folder in "${source_folders[@]}"; do
	# Iterate over optional argument variations
	for opt_args in "${opt_arg_variations[@]}"; do
		# Run the command multiple times for each variation and source folder
		for ((i = 1; i <= num_runs; i++)); do
			echo "Running test $i for source: $source_folder with options: $opt_args"
			run_command "$opt_args" "$source_folder" "$i"
			sleep $wait_time
		done

		# Append to the summary string
		summary+="- Ran $num_runs tests for source: $source_folder with options: $opt_args\n"
	done
done

# Call the collate_data script
echo "\nCollating data\n"
bash "$collate_script" "$run_name"

# Call the take_snapshot script
# echo "\nTaking snapshot\n"
# bash "$take_snapshot" "$run_name"

# Print the summary and error summary
echo -e "\n$summary"
if [ $error_count -gt 0 ]; then
	echo -e "Errors encountered during test runs:\n$error_summary"
	echo "Total errors: $error_count"
else
	echo "All test runs completed successfully."
fi
