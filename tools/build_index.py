import json,struct,re,os,glob
M='site/models'; out={}
lex=json.load(open('raw/nq_lexicon.json')); defs=json.load(open('raw/nq_definitions.json'))
def norm(n):
    n=n.strip(); n=re.sub(r'\.(l|r)$','',n); n=re.sub(r'^\((.*)\)$',r'\1',n).strip(); return n.lower()
L={norm(k):v for k,v in lex.items()}; D={norm(k):v for k,v in defs.items()}
info={}
for f in sorted(glob.glob(M+'/*.glb')):
    sysname=os.path.basename(f)[:-4]
    b=open(f,'rb').read(); l=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+l])
    names=[]
    for nd in j['nodes']:
        e=nd.get('extras',{})
        if 'zname' in e:
            names.append([e['zname'],e.get('zgroup',''),e.get('zmat','')])
            k=norm(e['zname'])
            if k not in info:
                d={}
                if k in L and L[k].get('la'): d['la']=L[k]['la']
                if k in D: d['def']=D[k]
                if d: info[k]=d
    out[sysname]=names
    print(sysname,len(names),os.path.getsize(f))
json.dump(out,open('site/data/index.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(info,open('site/data/lexicon.json','w'),ensure_ascii=False,separators=(',',':'))
tot=sum(len(v) for v in out.values()); print('total',tot,'with info',len(info), 'la',sum(1 for v in info.values() if 'la' in v))
