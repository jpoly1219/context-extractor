import os
import json
import openai
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

project_root = os.getcwd()
api_key_path = os.path.join(project_root, "openai-key.txt")
embeddings_path = os.path.join(
    project_root, "targets", "combined", "embeddings.json")

# List of directory paths
directory_paths = [
    os.path.join(project_root, "targets", "todo"),
    os.path.join(project_root, "targets", "playlist"),
    os.path.join(project_root, "targets", "emojipaint"),
    os.path.join(project_root, "targets", "booking"),
    os.path.join(project_root, "targets", "passwords")
]

with open(api_key_path, "r") as file:
    openai.api_key = file.read().strip()


def find_similar_chunks(header, embeddings, top_n=6):
    # Convert the header to an embedding
    header_embedding = openai.embeddings.create(
        input=header, model="text-embedding-ada-002").data[0].embedding

    # Calculate the cosine similarity between the header embedding and chunk embeddings
    chunk_embeddings = [embedding["embedding"] for embedding in embeddings]
    similarities = cosine_similarity([header_embedding], chunk_embeddings)[0]

    # Get the indices of the top-n most similar chunks
    top_indices = similarities.argsort()[-top_n:][::-1]

    # Return the top-n most similar chunks
    return [embeddings[i]["chunk"] for i in top_indices]


# Load the pre-generated embeddings from the JSON file
with open(embeddings_path, "r") as file:
    embeddings = json.load(file)

for directory_path in directory_paths:
    sketch_file_path = os.path.join(directory_path, "sketch.ts")

    # Check if the sketch file exists in the directory
    if os.path.isfile(sketch_file_path):
        with open(sketch_file_path, "r") as file:
            header = file.read()

        # Find the top-n most similar chunks
        similar_chunks = find_similar_chunks(header, embeddings)

        # Prepare the result string
        result = ""
        for i, chunk in enumerate(similar_chunks, start=1):
            result += f"# SNIPPET {i} #\n{chunk}\n\n"

        # Save the result to a file in the same directory
        rag_file_path = os.path.join(directory_path, "RAG.txt")
        with open(rag_file_path, "w") as file:
            file.write(result)

        print(f"RAG.txt file created in {directory_path}")
    else:
        print(f"sketch.ts file not found in {directory_path}")
