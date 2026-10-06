import sys
if hasattr(sys, 'set_int_max_str_digits'):
    sys.set_int_max_str_digits(0)     # allow str() of huge ints (Python 3.11+)
a, b = sys.stdin.read().split()
# Python integers are arbitrary precision: the grade-school loop is built in (Karatsuba, in fact)
print(int(a) * int(b))
