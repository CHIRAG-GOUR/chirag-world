"""
Install the MakeHuman assets the character build needs into MPFB's user data folder.

Run with any Python 3.10+ (not Blender):
    python assets/blender/scripts/install_mh_assets.py

Sources
- MakeHuman 1.1 system assets (CC0 / public domain): skin, eyes, brows, lashes, teeth, tongue, short02 hair,
  male_casualsuit02 (hoodie base + jeans), shoes05 (sneakers). Taken from Debian's archived `makehuman-data` package because
  the MakeHuman file server throttles downloads to ~50 KB/s. Debian ships meshes as compiled .npz, so they are
  converted back to the .obj each .mhclo names.
"""
import glob
import io
import os
import shutil
import sys
import tarfile
import tempfile
import urllib.request

import numpy as np

DEB_URL = "https://archive.debian.org/debian/pool/main/m/makehuman/makehuman-data_1.1.1-1.2_all.deb"
WANT = (
    "hair/short02/", "eyebrows/eyebrow001/", "eyelashes/eyelashes01/", "eyes/high-poly/", "eyes/materials/brown",
    "teeth/teeth_base/", "teeth/materials/", "tongue/tongue01/", "clothes/male_casualsuit02/", "clothes/shoes05/",
    "skins/young_asian_male/", "skins/textures/young_lightskinned_male_diffuse3.png",
)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def mpfb_user_data():
    base = os.environ.get("APPDATA") or os.path.expanduser("~/.config")
    for ver in sorted(glob.glob(os.path.join(base, "Blender Foundation", "Blender", "*")), reverse=True):
        p = os.path.join(ver, "extensions", ".user", "blender_org", "mpfb")
        if os.path.isdir(p):
            return os.path.join(p, "data")
    sys.exit("MPFB user folder not found: install the MPFB extension in Blender first.")


def download(url, dst, referer=None):
    if os.path.exists(dst):
        return dst
    req = urllib.request.Request(url, headers=dict(UA, **({"Referer": referer} if referer else {})))
    with urllib.request.urlopen(req, timeout=120) as r, open(dst + ".part", "wb") as f:
        shutil.copyfileobj(r, f, 1 << 20)
    os.replace(dst + ".part", dst)
    return dst


def extract_deb(deb, out):
    with open(deb, "rb") as f:
        assert f.read(8) == b"!<arch>\n", "not a .deb"
        while True:
            h = f.read(60)
            if len(h) < 60:
                break
            name, size = h[:16].decode().strip().rstrip("/"), int(h[48:58])
            data = f.read(size)
            f.read(size % 2)
            if not name.startswith("data.tar"):
                continue
            tf = tarfile.open(fileobj=io.BytesIO(data))
            for m in tf.getmembers():
                if not m.isfile() or "/makehuman/data/" not in m.name:
                    continue
                rel = m.name.split("/makehuman/data/", 1)[1]
                if rel.startswith(WANT):
                    m.name = rel
                    tf.extract(m, out, filter="data")


def npz_to_obj(root):
    """MakeHuman 1.1 compiled mesh (.npz) -> the .obj named by the sibling .mhclo."""
    for npz in glob.glob(os.path.join(root, "**", "*.npz"), recursive=True):
        z = np.load(npz, allow_pickle=False)
        if "fvert" not in z.files:
            continue
        objname = os.path.splitext(os.path.basename(npz))[0] + ".obj"
        for m in glob.glob(os.path.join(os.path.dirname(npz), "*.mhclo")):
            for line in open(m, encoding="utf-8", errors="ignore"):
                if line.startswith("obj_file"):
                    objname = line.split(None, 1)[1].strip()
        out = [f"o {os.path.splitext(objname)[0]}"]
        out += [f"v {x:.6f} {y:.6f} {w:.6f}" for x, y, w in z["coord"]]
        out += [f"vt {u:.6f} {v:.6f}" for u, v in z["texco"]]
        for fv, fu in zip(z["fvert"], z["fuvs"]):
            n = 3 if fv[3] in (fv[2], fv[0]) else 4
            out.append("f " + " ".join(f"{fv[k] + 1}/{fu[k] + 1}" for k in range(n)))
        with open(os.path.join(os.path.dirname(npz), objname), "w") as f:
            f.write("\n".join(out) + "\n")
        os.remove(npz)


def main():
    dest = mpfb_user_data()
    tmp = os.path.join(tempfile.gettempdir(), "chirag_mh_assets")
    os.makedirs(tmp, exist_ok=True)
    stage = os.path.join(tmp, "stage")
    shutil.rmtree(stage, ignore_errors=True)
    print("downloading makehuman-data (283 MB) ...")
    extract_deb(download(DEB_URL, os.path.join(tmp, "makehuman-data.deb")), stage)
    npz_to_obj(stage)
    shutil.copytree(stage, dest, dirs_exist_ok=True)
    print("system assets ->", dest)


if __name__ == "__main__":
    main()
