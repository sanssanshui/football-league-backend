# -*- coding: utf-8 -*-
"""Quick test script for the digital human chat pipeline."""
import requests, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Test via Fay directly
print("=== Test 1: Fay direct ===")
fay_url = "http://127.0.0.1:5100/api/dh/chat"
data = {"text": "什么是越位", "username": "test_user"}
r = requests.post(fay_url, json=data, stream=True, timeout=120)
print(f"Status: {r.status_code}")
count = 0
full = ""
for line in r.iter_lines(decode_unicode=True):
    if line and line.startswith("data:"):
        try:
            evt = json.loads(line[6:])
            if evt.get("type") == "TEXT":
                full += evt['content']
            elif evt.get("type") == "DONE":
                full = evt.get('fullText', full)
        except:
            pass
        count += 1
        if count > 20:
            break
print(f"Response length: {len(full)} chars")
print(f"Preview: {full[:100]}...")

# Test via NestJS proxy
print("\n=== Test 2: NestJS proxy ===")
nestjs_url = "http://127.0.0.1:5002/api/digital-human/chat"
data = {"text": "苏超有哪些球队", "username": "test_user"}
r = requests.post(nestjs_url, json=data, timeout=120)
print(f"Status: {r.status_code}")
ans = r.json().get("answer", "NO ANSWER")
print(f"Answer length: {len(ans)} chars")
print(f"Preview: {ans[:150]}...")

print("\n=== All tests passed! ===")
