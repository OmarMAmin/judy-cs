#!/usr/bin/env python3
"""Check every link in data/resources.json.

Usage:  python3 tools/check_links.py

Websites are fetched with curl. YouTube videos and playlists are looked up through
YouTube's oEmbed endpoint, which also prints their real title so you can spot a wrong ID.
Some sites block automated checks (Facebook, LinkedIn, LeetCode, Exercism, Project Euler,
Real Python, Huawei, depi.gov.eg). Those show up as 400, 403, 418 or 999. Open them by hand.
"""
import concurrent.futures as cf
import json
import pathlib
import subprocess
import urllib.parse

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")
KNOWN_BOT_BLOCKERS = ("facebook.com", "linkedin.com", "leetcode.com", "exercism.org",
                      "projecteuler.net", "realpython.com", "huawei.com", "depi.gov.eg",
                      "instagram.com", "github.com/signup")


def curl(url, body=False):
    args = ["curl", "-s", "-L", "-m", "25", "-A", UA, "-w", "\n%{http_code}"]
    if not body:
        args += ["-o", "/dev/null"]
    try:
        out = subprocess.run(args + [url], capture_output=True, text=True, timeout=40).stdout
    except Exception:
        return "ERR", ""
    code = out.strip().split("\n")[-1]
    return code, (out[: -len(code) - 1] if body else "")


def check(res):
    url = res["url"]
    if "youtube.com/playlist" in url or "youtube.com/watch" in url:
        code, body = curl("https://www.youtube.com/oembed?format=json&url="
                          + urllib.parse.quote(url, safe=""), body=True)
        try:
            info = json.loads(body)
            return res, code, f'{info.get("title", "")} | {info.get("author_name", "")}'
        except Exception:
            return res, code, ""
    return res, curl(url)[0], ""


def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    resources = json.loads((root / "data" / "resources.json").read_text(encoding="utf-8"))["resources"]
    bad = 0
    with cf.ThreadPoolExecutor(12) as pool:
        for res, code, title in pool.map(check, resources):
            if code == "200":
                if title:
                    print(f"ok    {res['id']}: {title}")
                continue
            blocked = any(h in res["url"] for h in KNOWN_BOT_BLOCKERS)
            label = "check by hand" if blocked else "BROKEN?"
            bad += 0 if blocked else 1
            print(f"{code:>5} {label}: {res['id']}  {res['url']}")
    print(f"\n{len(resources)} links checked, {bad} need attention.")


if __name__ == "__main__":
    main()
