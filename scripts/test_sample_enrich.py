#!/usr/bin/env python3
"""
Test parallel solution enrichment on 5 sample questions.
"""
import json
import re

def main():
    with open("src/gate/questions.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    qs = data["questions"]
    
    # Pick 5 diverse short questions
    targets = ["cse-1991-a-1-iii", "cse-1992-a-2-vi", "cse-1992-a-1-iv", "cse-1991-a-1-xii", "cse-1991-a-3-xiv"]
    for q_id in targets:
        match = next((q for q in qs if q["id"] == q_id), None)
        if match:
            print(f"Found {match['id']}: {match['subject']} - {match['topic']}")
            print("Current sol:", match["solution"])

if __name__ == "__main__":
    main()
