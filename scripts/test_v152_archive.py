import tempfile,pathlib,sys,copy
from archive_owner_all_sections_v152 import archive,ORIGIN,SECTIONS
ids=[f'aaaaaaaa-bbbb-4ccc-8ddd-{i:012d}' for i in range(1,9)]
rows=[]
for i,sec in enumerate(sorted(SECTIONS)):
 d={'id':ids[i],'section':sec,'title':'نمونه آزمون','revision':1}
 if sec=='guest_sentence_new':d.update(arabic='نص عربي',persian='ترجمه فارسی')
 elif sec=='photo_quotes':d['url']=ORIGIN+'/media/'+ids[7]
 else:d['url']='https://www.aparat.com/v/test'+str(i)
 if sec=='videos':d['coverUrl']=ORIGIN+'/media/'+ids[7]
 rows.append(d)
manifest={'schema':1,'revision':1,'items':rows}
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);calls=[]
 def media(i):calls.append(i);return b'\x89PNG\r\n\x1a\n' + b'test only'
 one=archive(manifest,root,media);assert len(one['activeIds'])==7 and len(list((root/'media').iterdir()))==1
 before={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
 archive(manifest,root,media);assert len(calls)==2
 try:archive({**manifest,'revision':0},root,media);raise AssertionError('rollback allowed')
 except ValueError:pass
 altered=copy.deepcopy(manifest);altered['items'][0]['title']='changed'
 try:archive(altered,root,media);raise AssertionError('overwrite allowed')
 except ValueError:pass
 assert before=={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
 archive({**manifest,'revision':2,'items':rows[:-1]},root,media);assert len(list((root/'items').iterdir()))==7;assert (root/'revisions/00000001.json').exists()
print('PASS: all-seven offline fixture, image hash deduplication, same revision immutability, rollback rejection, append-only historical records.')

with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp); row=next(r for r in rows if r['section']=='see_god');ident=row['id'];base={'schema':1,'revision':1,'items':[row]};archive(base,root,lambda i:None);original=(root/'items'/f'{ident}.json').read_bytes()
 first={**base,'revision':2,'transcripts':{ident:{'revision':2,'text':'متن اول'}}};one=archive(first,root,lambda i:None);old_path=root/'transcripts'/(one['transcriptSha256'][ident]+'.json');old=old_path.read_bytes()
 second={**base,'revision':3,'transcripts':{ident:{'revision':3,'text':'متن دوم'}}};two=archive(second,root,lambda i:None);assert two['transcriptSha256'][ident]!=one['transcriptSha256'][ident];assert old_path.read_bytes()==old;assert (root/'items'/f'{ident}.json').read_bytes()==original
 archive({**base,'revision':4,'transcripts':{}},root,lambda i:None);assert old_path.exists();assert len(list((root/'transcripts').glob('*.json')))==2
 try:archive({**base,'revision':5,'transcripts':{'wrong':{'revision':5,'text':'invalid'}}},root,lambda i:None);raise AssertionError('bad target accepted')
 except ValueError:pass
print('PASS: transcript revisions archived separately; historical session and old texts never overwritten, deletion preserves archived texts.')
