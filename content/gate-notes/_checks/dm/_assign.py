"""The planning-time PYQ → lesson assignment for Discrete Mathematics (used once to write the
"- PYQs (" lines of content/gate-notes/dm/_outline.md; the outline is the source of truth and
outline_pyq_assignment.py checks it). Ids are given without the 'cse-' prefix where it applies."""
A = {
 "dm-01-01-propositions-connectives": "1994-a-3-13 1995-a-44 1998-a-5 2002-a-8 2006-cs-28 2009-cs-24 2014-1-cs-53 2014-3-cs-1 2016-1-cs-1 2016-2-cs-1 2017-2-cs-11 2024-2-cs-2",
 "dm-01-02-equivalence-normal-forms": "1991-a-3-xii 1992-a-2-xvi 1993-ii-a-8-2 1995-b-61 1996-a-28 1997-a-17 1999-b-62-a 1999-b-62-b 2000-a-2-7 2001-a-3 2002-b-53-b 2004-cs-70 2005-cs-40 2006-cs-27 2007-cs-48 2008-cs-31 it-2008-it-1 2014-2-cs-53 2015-1-cs-14 2017-1-cs-1 2017-1-cs-29 2021-1-cs-7 2021-2-cs-15",
 "dm-01-03-inference-resolution": "1991-a-4-iv 1992-b-15-a 1993-ii-b-18 2003-cs-72 it-2004-it-31 2012-cs-1 2015-2-cs-3 2015-3-cs-24",
 "dm-02-01-predicates-quantifiers": "2004-cs-23 2005-cs-41 2006-cs-26 2007-cs-22 2008-cs-30 2009-cs-23 2009-cs-26 2010-cs-30 2011-cs-30 2012-cs-13 2013-cs-27 2014-1-cs-1 2014-3-cs-53 2019-cs-35 2023-cs-16 2025-1-cs-38 2026-2-cs-1 it-2004-it-3 it-2008-it-22",
 "dm-02-02-quantifier-laws-validity": "1991-b-15-b 1992-a-2-xv 2003-cs-32 2003-cs-33 2003-cs-71 it-2005-cs-36 it-2006-cs-21 it-2007-cs-21 it-2008-it-21 2013-cs-47 2015-2-cs-55 2016-2-cs-27 2017-1-cs-2 2018-cs-28 2020-cs-39 2025-2-cs-5",
 "dm-03-01-sets": "1993-ii-a-8-4 1995-a-20 1996-a-1 2000-a-2-6 2001-b-51-a 2005-cs-8 2006-cs-22 2006-cs-50 it-2006-cs-23 2008-cs-2 2015-1-cs-16 2015-2-cs-18 2015-3-cs-23 2021-2-cs-50",
 "dm-03-02-relations": "1994-a-2-3 1995-a-19 1996-a-27 1998-a-38 1998-b-62-b 1999-a-2 1999-b-51-1 1999-b-51-2 2002-a-42 2002-b-52-a 2004-cs-24 it-2004-it-4 2009-cs-4 2010-cs-3 2014-2-cs-50 2015-2-cs-16 2015-3-cs-41 2016-2-cs-26 2020-cs-17 2002-b-51-a",
 "dm-03-03-equivalence-relations": "1992-b-15-b 1996-b-56 1997-a-43 1997-b-58-a 1998-a-6 1998-a-7 1998-b-63-a 1998-b-63-b 2000-a-2-5 2001-a-2 2005-cs-42 2007-cs-2 2021-1-cs-43 2023-cs-39 2026-2-cs-16",
 "dm-03-04-functions": "1993-ii-a-8-6 1996-a-3 1996-a-26 1997-b-57-a 1997-b-57-b 1997-b-57-c 1998-a-8 2001-a-28 2001-b-52-a 2001-b-52-b 2002-b-51-b 2002-b-51-c 2003-cs-37 2005-cs-43 it-2005-cs-31 2006-cs-2 2012-cs-37 2014-1-cs-50 2014-3-cs-2 2014-3-cs-49 2016-1-cs-28 2021-2-cs-11 2024-1-cs-22 2025-1-cs-7",
 "dm-03-05-countability-proofs": "1991-b-15-a 1993-ii-a-8-3 1994-a-3-9 1995-b-71 1998-b-62-a 2001-a-27 2001-b-51-b 2018-cs-27",
 "dm-04-01-posets-hasse": "1991-a-1-xiv 1993-ii-a-8-5 1996-a-2 1997-a-41 1997-b-58-b 1998-b-63-c 2003-cs-31 it-2005-cs-32 2006-cs-4 2007-cs-26 it-2007-cs-23 2024-2-cs-24",
 "dm-04-02-lattices": "1992-b-14-b 1994-a-2-9 1997-a-18 1999-a-28 2002-b-52-b 2004-cs-73 2005-cs-9 it-2008-it-28 2015-1-cs-34 2017-2-cs-21 2025-2-cs-32",
 "dm-05-01-binary-operations": "1993-ii-c-28 1994-a-2-2 1997-a-16 1998-b-64-a 1998-b-64-b 1998-b-64-c 2003-cs-7 2003-cs-38 it-2006-cs-2 2013-cs-1 2024-1-cs-42 2025-1-cs-39",
 "dm-05-02-groups": "1992-b-14-a 1994-a-10 1995-a-42 1996-a-4 1996-a-29 2000-b-4-a 2000-b-4-b 2002-a-6 2004-cs-72 2005-cs-13 2005-cs-46 2006-cs-3 2009-cs-1 2010-cs-4 2022-cs-17 2023-cs-41 2024-2-cs-53",
 "dm-05-03-subgroups-lagrange": "1995-b-69-a 1995-b-69-b 1999-b-52-a 1999-b-52-b 1999-b-52-c 2007-cs-21 2009-cs-22 2014-3-cs-3 2014-3-cs-50 2018-cs-19 2019-cs-10 2020-cs-18 2021-1-cs-34",
 "dm-05-04-modular-rings-fields": "1994-b-38 it-2007-cs-16 it-2008-it-26 2016-2-cs-29 2019-cs-21",
 "dm-06-01-counting-basics": "1991-a-1-xiii 1995-a-55-a 1998-a-23 2001-a-26 2003-cs-5 2004-cs-75 2006-cs-24 it-2008-it-24 2014-1-cs-37 2014-2-cs-49 2015-2-cs-9 2023-cs-38 2025-1-cs-20 2026-1-cs-2",
 "dm-06-02-combinations-binomial": "1991-a-2-iv 1991-b-16-a 1994-a-2-4 1999-a-3 2003-cs-4 2006-cs-25 2007-cs-84 2007-cs-85 2016-2-cs-40 2019-cs-5",
 "dm-06-03-distributions": "1999-a-27 2000-b-5-a 2000-b-5-b 2002-b-61-a 2002-b-61-b 2002-b-61-c 2003-cs-34 it-2008-it-25 2015-3-cs-5 2021-1-cs-19 2022-cs-22",
 "dm-06-04-inclusion-exclusion": "1993-ii-b-17 1995-b-73-b 1998-a-39 it-2004-it-2 it-2004-it-35 it-2005-cs-34 it-2006-cs-24 2015-2-cs-40 2017-1-cs-47 2020-cs-42",
 "dm-06-05-pigeonhole": "2000-a-1-1 2005-cs-44",
 "dm-06-06-sums-series": "1994-b-37-c 1994-b-37-d 2008-cs-24 2015-1-cs-26 it-2004-it-34",
 "dm-07-01-forming-recurrences": "1992-b-7-a 1992-b-7-b 1996-b-57 2000-b-3 2008-cs-78 2008-cs-79 2014-1-cs-49 2015-1-cs-49 2016-1-cs-2",
 "dm-07-02-solving-recurrences": "1998-a-58-a 2002-a-3 2003-cs-35 2016-1-cs-27 2022-cs-41 2023-cs-5 2024-2-cs-5",
 "dm-07-03-generating-functions": "2005-cs-50 2016-1-cs-26 2017-2-cs-47 2018-cs-1 2022-cs-26",
 "dm-08-01-graph-basics": "1991-b-16-b 1994-a-2-5 1995-b-72 2000-b-6-a 2001-a-40 2002-a-25 2004-cs-79 it-2004-it-37 2006-cs-71 2006-cs-72 it-2008-it-27 2009-cs-3 2010-cs-28 2013-cs-24 2013-cs-25 2014-1-cs-51 2014-1-cs-52 2014-2-cs-3 2016-2-cs-28 2017-2-cs-23 2022-cs-27 2022-cs-42",
 "dm-08-02-isomorphism-complements": "1994-a-6 2012-cs-26 2013-cs-26 2014-2-cs-51 2015-2-cs-28",
 "dm-08-03-connectivity": "1991-a-1-xv 1995-a-25 1997-a-42 1999-a-15 1999-b-53-a 1999-b-53-b 1999-b-53-c 2000-b-6-b 2003-cs-8 2004-cs-81 2006-cs-73 2015-2-cs-50 2018-cs-43 2021-1-cs-36 2022-cs-20",
 "dm-08-04-trees": "1992-a-3-iii 1993-ii-a-8-1 it-2004-it-5 it-2007-cs-25 it-2007-cs-63 2008-cs-42 it-2008-it-76 it-2008-it-77 2010-cs-1 2014-3-cs-51 2017-1-cs-20 2022-cs-48 2024-1-cs-24 2026-2-cs-26",
 "dm-08-05-euler-hamilton": "2007-cs-23 2012-cs-38 2019-cs-12",
 "dm-08-06-planarity": "1992-a-1-x 1992-a-2-viii 2003-cs-40 2005-cs-10 2005-cs-47 2007-cs-4 2011-cs-17 2012-cs-17 2014-3-cs-52 2015-1-cs-54 2021-1-cs-16",
 "dm-08-07-colouring": "2002-a-4 2004-cs-77 it-2006-cs-25 2008-cs-23 it-2008-it-3 2009-cs-2 2016-2-cs-3 2018-cs-18 2020-cs-52 2022-cs-40 2023-cs-45 2024-1-cs-41 2024-2-cs-50 2026-1-cs-45",
 "dm-08-08-matching-covers": "2003-cs-36 2004-cs-76 2005-cs-11 it-2008-it-4 2026-1-cs-37 2026-1-cs-47",
}
def ids(lesson):
    return [x if x.startswith("it-") else "cse-" + x for x in A[lesson].split()]
if __name__ == "__main__":
    import json, collections
    dm = {q["id"]: q for q in json.load(open("src/gate/questions.json"))["questions"] if q["subject"] == "dm"}
    seen = collections.Counter(i for l in A for i in ids(l))
    print("dups", [k for k, v in seen.items() if v > 1]); print("unknown", [k for k in seen if k not in dm])
    print("missing", sorted(set(dm) - set(seen))); print(len(seen))
    for l in A: print(l, len(ids(l)))
