import openai
import json
import os

project_root = os.getcwd()
file_path = os.path.join(project_root, "targets",
                         "combined", "vector_prelude.ts")
api_key_path = os.path.join(project_root, "openai-key.txt")
embeddings_path = os.path.join(
    project_root, "targets", "combined", "embeddings.json")
chunk_length = 150
max_chunks = 10000  # Maximum number of chunks to process

with open(api_key_path, "r") as file:
    openai.api_key = file.read().strip()

with open(file_path, "r") as file:
    text = file.read()

chunks = [text[i:i+chunk_length] for i in range(0, len(text), chunk_length)]
total_chunks = len(chunks)
print(f"Total chunks: {total_chunks}")

embeddings = []
for i, chunk in enumerate(chunks[:max_chunks], start=1):
    print(f"Processing chunk {i}/{max_chunks}")
    try:
        response = openai.embeddings.create(
            input=chunk, model="text-embedding-ada-002")
        print(f"API Response: {response}")  # Debugging information
        embedding = response.data[0].embedding
        embeddings.append({"chunk": chunk, "embedding": embedding})
    except Exception as e:
        print(f"Error processing chunk {i}: {str(e)}")

# Save embeddings to a JSON file
with open(embeddings_path, "w") as file:
    json.dump(embeddings, file)

print("Embeddings saved to " + embeddings_path)
