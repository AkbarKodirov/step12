import re,json
F='/root/.claude/uploads/1c94c67a-9e1a-5147-8723-e2b7b906f945/5a7f4e76-MathBook_2.0_3.pdf.txt'
L=open(F,encoding='utf8').read().split('\n')
names=['Expressions','Linear Equations','Linear System of Equations','Linear Functions','Linear Inequalities','Polynomials','Exponents&Radicals','Functions&Function Notation','Exponential Functions','Quadratics','Percent; Ratio&Proportion','Unit Conversion','Probability','Mean, Median, Mode, Range','Scatterplots','Research organizing','Lines&Angles','Triangles','Trignometry','Circles','Areas&Volumes']
qre=re.compile(r'^(\d+)\. \[(.+?)\]\s*$')
sec=-1; cur=None; Q=[]; answers={}; mode='q'; last=0
for l in L[100:]:
    if l.startswith('Answers:'):
        mode='a'; asec=sec; answers.setdefault(asec,{}); cur=None; continue
    if re.match(r'^@satashkent \d+',l) or l.strip()=='' and False: continue
    m=qre.match(l)
    if m:
        n=int(m.group(1))
        if n==1 and (mode=='a' or sec<0): sec+=1
        mode='q'
        cur={'sec':sec,'n':n,'src':m.group(2),'lines':[]}; Q.append(cur); continue
    if mode=='a':
        t=l.split()
        if t and t[0]=='Number': continue
        # pairs
        if len(t)>=2 and t[0].isdigit():
            for i in range(0,len(t)-1,2):
                if t[i].isdigit(): answers[asec][int(t[i])]=t[i+1] if len(t)==2*(len(t)//2) else ' '.join(t[i+1:i+2])
        continue
    if cur is not None: cur['lines'].append(l)
print(len(Q), sec)
from collections import Counter
c=Counter(q['sec'] for q in Q)
for s in sorted(c): print(s,names[s],c[s],len(answers.get(s,{})))
json.dump({'Q':Q,'A':{str(k):v for k,v in answers.items()}},open('raw.json','w'))
