"""Write the Viz scene files of one chapter: python3 content/gate-notes/_checks/pds/_viz.py <chapter> [scene …]"""
import sys

import chapterlib as L

L.write_viz(int(sys.argv[1]), sys.argv[2:])
