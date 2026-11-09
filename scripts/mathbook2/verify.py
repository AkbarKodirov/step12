# Solves Math Book 2.0 questions with sympy and compares with the book's answer key.
# Covers: single equations, two-variable systems, f(x) evaluation, "equivalent expression", "number of solutions".
# Usage: python3 scripts/mathbook2/verify.py  -> prints verified / mismatched / unchecked ids, writes verify.json
import re,json,sys
from fractions import Fraction
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,convert_xor
T=standard_transformations+(implicit_multiplication_application,convert_xor)
bank=json.load(open('public/bank/bank.json'))
Bm={q['id']:q for q in bank if q.get('set')=='mathbook2'}
txt=open('scripts/mathbook2/mathbook2.txt',encoding='utf8').read()
raw={}
for ch in txt.split('\n@')[1:]:
    ls=ch.split('\n'); h=ls[0].split(' | ')
    raw['mb2-'+h[0].lstrip('@')]=ls[1:]
def num(s):
    s=s.replace('−','-').replace(',','').strip().rstrip('.')
    m=re.fullmatch(r'\{(-?[\d.]+)/(-?[\d.]+)\}',s)
    try:
        if m: return sp.Rational(m.group(1))/sp.Rational(m.group(2))
        return sp.Rational(s) if '/' not in s or re.fullmatch(r'-?\d+/\d+',s) else None
    except Exception: return None
def conv(s):
    s=s.replace('−','-').replace('×','*').replace('·','*').replace('÷','/')
    s=re.sub(r'\{([^{}/]+)/([^{}]+)\}',r'((\1)/(\2))',s)
    s=re.sub(r'(\d),(\d{3})',r'\1\2',s)
    s=re.sub(r'\^\{([^}]*)\}',r'^(\1)',s)
    return s
def P(s,loc=None):
    return parse_expr(conv(s),transformations=T,local_dict=loc or {},evaluate=True)
def eqparse(s):
    l,r=conv(s).split('=',1)
    return sp.Eq(parse_expr(l,transformations=T),parse_expr(r,transformations=T))
def keyval(q):
    if q['format']=='mc': return q['options'][q['correct']]
    return q['answer'].split(' | ')[0]
def keynum(q):
    if q['format']=='mc':
        o=q['options'][q['correct']]
        return o
    return q['answer'].split(' | ')[0]
def tonum(s):
    s=s.replace('−','-').replace(',','').strip()
    m=re.fullmatch(r'\{?(-?[\d.]+)/(-?[\d.]+)\}?',s)
    try:
        if m: return sp.Rational(m.group(1))/sp.Rational(m.group(2))
        return sp.Rational(s)
    except Exception: return None
def ok_val(vals,q):
    # vals: list of candidate numeric results; compare with key (and options for mc)
    k=tonum(q['answer'].split(' | ')[0] if q['format']=='sa' else (q.get('optsrc') or [''])[q['correct']] if False else '')
    return None
res={'ok':[],'bad':[],'skip':[]}
def check(id,q):
    L=raw[id]; lines=[l for l in L if l.strip() and not re.match(r'^[A-D]\) ',l)]
    stem=' '.join(l[2:] if l.startswith('$ ') else l for l in lines)
    disp=[l[2:] for l in lines if l.startswith('$ ')]
    opts=[l[3:] for l in L if re.match(r'^[A-D]\) ',l)]
    ans=(q['answer'].split(' | ')[0] if q['format']=='sa' else opts[q['correct']])
    kv=tonum(ans)
    # equivalent expression
    m=re.search(r'(?:expression|polynomial) (?:is )?equivalent to (.+?)\?$',stem.strip())
    if m and opts and len(opts)==4:
        try:
            E=P(m.group(1)); good=[]
            for i,o in enumerate(opts):
                good.append(sp.simplify(sp.expand(P(o)-E))==0)
            return ('ok' if good==[i==q['correct'] for i in range(4)] else 'bad:%s'%good)
        except Exception as e: return 'skip'
    # collect equations
    eqs=[d for d in disp if '=' in d and not re.search(r'[<>≤≥]',d)]
    if not eqs:
        m=re.search(r'\bIf (.+?=.+?),(?: what| then|\s)',stem)
        if m and not re.search(r'[a-z]{3,}',re.sub(r'\b(and|sin|cos|tan)\b','',m.group(1))): eqs=[x.strip() for x in m.group(1).split(' and ')]
    tg=re.search(r'value of ([^?]+)\?',stem)
    # f(x) eval
    fm=[re.fullmatch(r'([fgh])\((\w)\) = (.+)',e.strip()) for e in eqs]
    if len(eqs)==1 and fm[0] and tg:
        t=re.fullmatch(r'([fgh])\((-?\d+(?:\.\d+)?|−\d+)\)',tg.group(1).strip().replace('−','-'))
        if t and t.group(1)==fm[0].group(1):
            try:
                v=P(fm[0].group(3)).subs(sp.Symbol(fm[0].group(2)),sp.Rational(t.group(2)))
                return 'ok' if kv is not None and sp.simplify(v-kv)==0 else ('bad:%s'%v)
            except Exception: return 'skip'
    if eqs and tg and len(eqs)<=2 and not any(fm):
        try:
            es=[eqparse(e) for e in eqs]
            syms=set().union(*[e.free_symbols for e in es])
            T_=P(tg.group(1)); tsy=T_.free_symbols
            if not tsy<=syms: return 'skip'
            if len(syms)!=len(es): return 'skip'
            sols=sp.solve(es,list(syms),dict=True)
            vals=set()
            for s_ in sols:
                v=T_.subs(s_)
                if v.is_real: vals.add(sp.nsimplify(v))
            if not vals: return 'skip'
            if kv is None: return 'skip'
            if re.search(r'least|greatest|smallest|largest|positive|negative|sum|product',stem) : return 'skip'
            if len(vals)>1: return 'skip'
            return 'ok' if sp.simplify(list(vals)[0]-kv)==0 else 'bad:%s'%vals
        except Exception as e: return 'skip'
    r2=check2(id,q,stem,eqs,opts,ans,kv)
    if r2: return r2
    return 'skip'
def check2(id,q,stem,eqs,opts,ans,kv):
    if len(eqs)!=1: return None
    try: e=eqparse(eqs[0])
    except Exception: return None
    syms=sorted(e.free_symbols,key=str)
    if any(str(x).startswith('f') for x in syms) and False: return None
    expr=e.lhs-e.rhs
    words={'zero':0,'exactly one':1,'exactly two':2,'infinitely many':'inf','one':1,'two':2}
    if len(syms)==1:
        x=syms[0]
        if re.search(r'how many (distinct )?(real )?solutions',stem,re.I):
            if sp.Poly(expr,x).degree()<1: return None
            n=len([r for r in sp.roots(sp.Poly(expr,x)) if sp.im(r)==0]) if sp.Poly(expr,x).degree()<=2 else None
            if n is None: return None
            key=ans.strip().lower()
            if key in words: return 'ok' if words[key]==n else 'bad:%s'%n
            return 'ok' if kv==n else 'bad:%s'%n
        if re.search(r'sum of the (real )?solutions',stem) and sp.Poly(expr,x).degree()<=3:
            rs=[r for r in sp.roots(sp.Poly(expr,x),multiple=True) if sp.im(r)==0]
            return 'ok' if kv is not None and sp.simplify(sum(rs)-kv)==0 else 'bad:%s'%sum(rs)
        if re.search(r'(positive|greatest|largest) solution',stem) and sp.Poly(expr,x).degree()==2:
            rs=[r for r in sp.roots(sp.Poly(expr,x),multiple=True) if sp.im(r)==0]
            v=max(rs) 
            return 'ok' if kv is not None and abs(float(v)-float(kv))<1e-6 else 'bad:%s'%v
        return None
    if len(syms)==2:
        # constant k in the equation, variable x
        x=[s_ for s_ in syms if str(s_)=='x']
        if not x: return None
        x=x[0]; k=[s_ for s_ in syms if s_!=x][0]
        tgt=re.search(r'value of '+re.escape(str(k)),stem)
        if not tgt and not re.search(r'(least|greatest) possible value of '+str(k),stem): return None
        P_=sp.Poly(expr,x)
        if P_.degree()==2:
            a,b,c=P_.all_coeffs(); disc=sp.expand(b*b-4*a*c)
            if re.search(r'exactly one (real )?solution|one real solution',stem) and not re.search(r'(least|greatest)',stem):
                sol=sp.solve(disc,k); 
                if any(sp.simplify(v-kv)==0 for v in sol if kv is not None) : return 'ok'
                return 'bad:%s'%sol
            m=re.search(r'(least|greatest) possible (integer )?value of '+str(k),stem)
            cond=None
            if re.search(r'no real solutions?',stem): cond=disc<0
            elif re.search(r'two distinct real solutions|two real solutions',stem): cond=disc>0
            if cond is not None and m and kv is not None:
                import math
                from sympy import solveset,S
                ss=solveset(cond,k,domain=S.Reals)
                lo=ss.inf if m.group(1)=='least' else None
                hi=ss.sup if m.group(1)=='greatest' else None
                if not ss.is_Interval and not ss.is_Union: return None
                bnd=lo if lo is not None else hi
                if not (bnd.is_finite): return None
                bf=float(bnd); 
                if m.group(1)=='least': v=math.floor(bf)+1
                else: v=math.ceil(bf)-1
                return 'ok' if v==float(kv) else 'bad:%s'%v
        if P_.degree()==1 and re.search(r'no solution|infinitely many',stem):
            a,b=P_.all_coeffs()
            if re.search(r'no solution',stem):
                sol=sp.solve(a,k)
                return 'ok' if kv is not None and any(sp.simplify(v-kv)==0 for v in sol) else 'bad:%s'%sol
        return None
    return None
for id,q in Bm.items():
    try: r=check(id,q)
    except Exception as e: r='skip'
    if r=='ok': res['ok'].append(id)
    elif r.startswith('bad'): res['bad'].append((id,r))
    else: res['skip'].append(id)
print(len(res['ok']),'verified;',len(res['bad']),'mismatch;',len(res['skip']),'not auto-checkable')
for i,r in res['bad']: print(i,r)
json.dump(res,open('/tmp/verify.json','w'))
