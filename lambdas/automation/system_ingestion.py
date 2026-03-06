"""
Lambda handler — Auto-Learning System Ingestion.

Crawls the application's source code repositories (nestjs-backend, frontend, docs),
chunks the files into ~600 token lengths, and sends them to the NestJS 
internal endpoint to be vectorized and saved to the SystemDocument catalog.
"""

import json
import logging
import os
import hashlib
import time

from lambdas.automation.base_automation import call_internal_endpoint, emit_metric

logger = logging.getLogger(__name__)

# ~600 tokens approx 2400 chars, 100 token overlap approx 400 chars.
CHUNK_SIZE = 2400
CHUNK_OVERLAP = 400

# Exclude list 
EXCLUDED_DIRS = {".git", ".next", "node_modules", "dist", ".cache", "venv", "__pycache__", "seed"}
EXCLUDED_EXTS = {".png", ".jpg", ".map", ".ico", ".svg", ".lock"}

def chunk_content(text: str, size: int, overlap: int) -> list[str]:
    """Splits text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start += (size - overlap)
    return chunks

def crawl_repo(root_dir: str) -> list[dict]:
    """Recursively parses all valid files into mapped chunk dictionaries."""
    all_chunks = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Mutating dirnames in place skips excluded directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        
        for file in filenames:
            ext = os.path.splitext(file)[1].lower()
            if ext in EXCLUDED_EXTS or file.startswith(".env"):
                continue
                
            filepath = os.path.join(dirpath, file)
            # Make filepath relative to the project root for prettier citations
            rel_path = os.path.relpath(filepath, start=os.path.dirname(root_dir))
            
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
            except UnicodeDecodeError:
                # Skip binaries that snuck past the extension filter
                continue
                
            if not content.strip():
                continue
                
            text_chunks = chunk_content(content, CHUNK_SIZE, CHUNK_OVERLAP)
            for i, txt in enumerate(text_chunks):
                # Unique hash identifying file version and chunk offset
                raw_token = f"{filepath}_{i}_{hashlib.md5(txt.encode('utf-8')).hexdigest()}"
                chunk_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
                
                all_chunks.append({
                    "filePath": rel_path,
                    "content": txt,
                    "chunkHash": chunk_hash
                })
                
    return all_chunks

def handler(event: dict, context) -> dict:
    start_time = time.time()
    
    # We resolve the repo root roughly based on testing environment execution
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "../../"))
    
    logger.info("Starting System Ingestion. Root: %s", project_root)
    
    target_dirs = [
        os.path.join(project_root, "nestjs-backend", "src"),
        os.path.join(project_root, "frontend", "app"),
    ]
    
    all_chunks = []
    for d in target_dirs:
        if os.path.exists(d):
            all_chunks.extend(crawl_repo(d))
            
    logger.info("Found %d chunks to ingest.", len(all_chunks))
    
    if not all_chunks:
        return {"statusCode": 200, "body": "No files found to ingest."}
        
    # Send in batches of 50 to avoid overloading the API Gateway payload limit
    batch_size = 50
    total_ingested = 0
    total_errors = 0
    
    # Endpoint definition
    endpoint_url = "/internal/system/ingest"
    
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i+batch_size]
        try:
            res = call_internal_endpoint(endpoint_url, method="POST", body={"chunks": batch})
            total_ingested += res.get("ingested", 0)
            total_errors += res.get("errors", 0)
        except Exception as e:
            logger.error("Failed batch %d: %s", i, e)
            total_errors += len(batch)
            
    duration = (time.time() - start_time) * 1000
    emit_metric("SystemChunksIngested", total_ingested)
    
    logger.info("Ingestion complete. Processed=%d, Errors=%d, Duration=%.0fms", 
                total_ingested, total_errors, duration)
                
    return {
        "statusCode": 200,
        "body": json.dumps({
            "ingested": total_ingested,
            "errors": total_errors,
            "duration_ms": duration
        })
    }
