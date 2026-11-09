import json,re,sys
d=json.load(open('raw.json'));Q=d['Q'];A=d['A']
names=['Expressions','Linear Equations','Linear System of Equations','Linear Functions','Linear Inequalities','Polynomials','Exponents&Radicals','Functions&Function Notation','Exponential Functions','Quadratics','Percent; Ratio&Proportion','Unit Conversion','Probability','Mean, Median, Mode, Range','Scatterplots','Research organizing','Lines&Angles','Triangles','Trignometry','Circles','Areas&Volumes']
FIG=re.compile(r'graph|figure|diagram|scatter|histogram|dot plot|box plot|boxplot|\btables?\b|picture|illustration|shown (below|above)|\b(below|above)\b|line plot|bar chart|pie|number line|\bmap\b|grid|chart|\bplot|shaded|the line shown|shown in|as shown|parallelogram shown|regular ',re.I)
OPTRE=re.compile(r'^([A-D])\) ?(.*)$')
WORDEND=re.compile(r'(^|\s)(is|of|a|in|at|to|by|and|or|if|has|for|the|as|are|be|on|than|with|from|that|each|every|any|per|about|into|equal|equals|there|its|an|then|when|where|value|x|y)$')
def vartoken(l):
    last=l.split(' ')[-1]
    if re.fullmatch(r'[(\[−-]?\d*\.?\d*[a-zA-Z](\)|\])?',last) and not re.search(r'(^|\s)(a|I|A)$',l): return True
    if re.search(r'\)$',last) : return True
    return False
def isvar_any(l):
    return bool(re.search(r'[a-zA-Z\)]$',l))
flagfrac=[]
lbexp=[]
def proc(lines):
    """merge lines of a chunk -> (text, ok)"""
    ls=[l.strip() for l in lines if l.strip()]
    out=[];i=0;ok=True;flagfrac.clear()
    while i<len(ls):
        l=ls[i]
        if l in ('.',',',';','?') and out:
            out[-1]+=l; i+=1; continue
        NUM=r'\d+(?:\.\d+)?'
        if re.fullmatch(NUM,l) and i+1<len(ls) and re.fullmatch(r'\d+',ls[i+1]) and not (i+2<len(ls) and re.fullmatch(NUM,ls[i+2])) and not (out and re.search(r'\d$',out[-1]) and not re.search(r'[+−=(,]\s*\d+$',out[-1])):
            fr='{'+l+'/'+ls[i+1]+'}'
            nxt=ls[i+2] if i+2<len(ls) else ''
            if out and out[-1].endswith('−'): out[-1]+=fr
            elif out and out[-1] and not re.search(r'[\s(]$',out[-1]) and out[-1][-1] in '=': out[-1]+=' '+fr
            elif out: out[-1]+=' '+fr
            else: out.append(fr)
            i+=2
            if nxt and re.match(r'^(\(|[a-z](?=[\s)+−=(,.]|$))',nxt):
                out[-1]+=nxt; i+=1
            continue
        # frac: pure digits fragment line after a line ending in number
        if out:
            prev=out[-1]
            if re.fullmatch(r'\d{1,4}',l) and re.search(r'(^|[\s(=,+−])\d+$',prev) and not re.fullmatch(r'\d+',prev):
                m=re.search(r'(\d+)$',prev)
                nxt=ls[i+1] if i+1<len(ls) else ''
                before=prev[:m.start()].rstrip()
                if before and before[-1] in '+−-*×·/': ok=False; flagfrac.append(1)
                out[-1]=prev[:m.start()]+'{'+m.group(1)+'/'+l+'}'
                if nxt and re.match(r'^(\(|[a-z](?=[\s)+−=(,.]|$))',nxt):
                    out[-1]+=nxt; i+=1
                i+=1; continue
                i+=1; continue
            # exponent: line begins with digits+rest, prev ends with variable token
            m=re.match(r'^(\d{1,2})(?=$|[ ,.)+−=?\]])(.*)$',l)
            if m and (vartoken(prev) or re.search(r'[a-z]\)$|\)$',prev)) and len(prev)<60 and not re.search(r'\b(is|of|in|at|to|by|and|or|if|has|for|the|as|are|be|than|with|from)$',prev):
                mathy=re.search(r'[=+−()\d^]',prev) or len(prev)<=3
                if mathy:
                    out[-1]=prev+'^'+m.group(1); lbexp.append(1)
                    rest=m.group(2)
                    if rest.strip():
                        out[-1]+=' '+rest.strip() if not rest.startswith((')',',','.')) else rest
                    i+=1; continue
        out.append(l); i+=1
    # leftover fragments gate
    bad=[x for x in out[1:] if len(x)<=3 and not re.fullmatch(r'[A-Za-z]{2,3}',x)]
    bad+= [x for x in out if x in ('√','−','+','=','(',')','∞')]
    text=' '.join(out)
    return text,out,bool(bad) or bool(flagfrac)
def tok_exp(m):
    return m.group(1)+'^'+m.group(2)+m.group(3)+m.group(4)
def inline(s):
    s=re.sub(r'[\x00-\x08\x0b-\x1f\u00ad]','',s)
    s=s.replace('function if defined','function is defined')
    s=s.replace('◦','°').replace('′',"'")
    s=re.sub(r'̸\s*','∠',s)
    # spaced exponent: "79t 2 − 12u", "2t 2u(79t" 
    s=re.sub(r'(?<![\w^])(\d*[a-z]) (\d)(?=[a-z(]|\s*[−+=)]|\s*$)',r'\1^\2',s)
    toks=s.split(' ')
    for k,t in enumerate(toks):
        m=re.fullmatch(r'([(\[−-]?\d*[a-z]{1,3})(\d)([a-z]{0,2})([,.)?;]*)',t)
        if m and not re.fullmatch(r'[a-z]{3}\d',t): toks[k]=tok_exp(m)
    s=' '.join(toks)
    s=re.sub(r'\)(\d)(?![\d.,]\d|[\d.])',r')^\1',s)
    s=re.sub(r'(?<![A-Za-z])([a-z]{1,2})(\d)(?![\d.]|[a-z]{2})',r'\1^\2',s)
    s=re.sub(r'(\d), (\d{3})(?!\d)',lambda m:m.group(0) if '(' in s[:m.start()] and s[:m.start()].count('(')>s[:m.start()].count(')') else m.group(1)+','+m.group(2),s)
    s=re.sub(r'(?<![\w)}])-(?=\d)','−',s)
    return s
def build(q):
    ls=[l for l in q['lines']]
    # split into stem and options
    opts=[];stem=[];cur=None
    for l in ls:
        m=OPTRE.match(l.strip())
        if m and (cur is not None or m.group(1)=='A') and (len(opts)==ord(m.group(1))-65):
            opts.append([m.group(2)]);cur=opts[-1];continue
        if cur is not None: cur.append(l)
        else: stem.append(l)
    return stem,opts
def paras(sl):
    out=[];buf=[]
    sl2=[]
    for x in sl:
        if sl2 and re.match(r'^[,.;?]',x.strip()): sl2[-1]+=x.strip()
        else: sl2.append(x)
    for x in sl2:
        words=re.findall(r'[A-Za-z]{3,}',re.sub(r'\b(sin|cos|tan|log|min|max)\b','',x))
        disp=bool(re.search(r'[=<>≤≥]',x)) and len(words)==0 and len(x)<70 and not re.search(r'[?.,]$',x)
        if disp:
            if buf: out.append(inline(' '.join(buf))); buf=[]
            out.append('$ '+inline(x))
        else: buf.append(x)
    if buf: out.append(inline(' '.join(buf)))
    return out
res=[]
stats={}
for q in Q:
    sec=q['sec']
    stem,opts=build(q)
    lbexp.clear()
    stxt,sl,bad1=proc(stem)
    otx=[];bad2=False
    for o in opts:
        t,_,b=proc(o); otx.append(t); bad2|=b
    alltxt=stxt+' '+' '.join(otx)
    lb=bool(lbexp)
    flags=[]
    if bad1 or bad2: flags.append('frag')
    if FIG.search(alltxt): flags.append('fig')
    if re.search(r'\^\d\d',inline(alltxt)): flags.append('exp2')
    if re.search(r'\(\d[\d.]*\)\^?\s?[a-z]\b|\)\^\d[a-z]|\)\s[a-z]\b',inline(alltxt)): flags.append('expvar')
    if any(len(x)==1 and x.isalpha() for x in sl+[y for o in opts for y in o]) : flags.append('amb')
    if re.search(r'√|\{\s*\}',alltxt) and re.search(r'√',alltxt): flags.append('rad')
    if any(re.fullmatch(r'[\d,.]+ [\d,.]+',o) for o in otx): flags.append('optfrac')
    if opts and len(opts)!=4: flags.append('opts')
    ans=A.get(str(sec),{}).get(str(q['n']))
    if ans is None: flags.append('noans')
    if opts and ans and ans not in 'ABCD': flags.append('anslen')
    if not opts and ans and ans in list('ABCD') : flags.append('anslen')
    res.append({'sec':sec,'n':q['n'],'src':q['src'],'stem':inline(stxt),'stemlines':paras(sl),'opts':[inline(x) for x in otx],'ans':ans,'flags':flags,'lbexp':lb})
json.dump(res,open('clean.json','w'),ensure_ascii=False)
from collections import Counter
c=Counter(tuple(r['flags']) for r in res)
for k,v in c.most_common(): print(v,k)
print(sum(1 for r in res if not r['flags']))
