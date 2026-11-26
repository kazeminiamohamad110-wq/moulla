#!/usr/bin/env python3
"""Archive full seven-section manifest into a NEW scope; never overwrite v150 snapshots.
Offline mode is default. Use --fetch only after confirming live deployment.
This script never pushes to GitHub, changes the Worker or deletes old content.
"""
import argparse, hashlib, json, re, pathlib, urllib.parse, urllib.request
ORIGIN='https://pmm-content-updates.kazeminia-mohamad110.workers.dev'
SECTIONS={'nahj_audio','towhid','see_god','kafi','videos','photo_quotes','guest_sentence_new'}
UUID=r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}'
MAX=1024*1024; IMAGE_MAX=8*MAX
def encode(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def require(ok,msg):
 if not ok:raise ValueError(msg)
def url_parts(value):
 u=urllib.parse.urlsplit(value);require(u.scheme=='https' and not u.username and not u.password and not u.port and not u.query and not u.fragment,'unsafe media URL');return u

def valid_link(url,section):
 u=url_parts(url);p=urllib.parse.unquote(u.path)
 if u.hostname=='eitaa.com':return bool(re.fullmatch(r'/(?:[A-Za-z0-9_]+/[0-9]+|joinchat/[A-Za-z0-9]+)/?',p))
 if u.hostname in ('aparat.com','www.aparat.com'):return bool(re.fullmatch(r'/v/[A-Za-z0-9_-]+/?',p))
 if u.hostname!='dl.kazeminia110.ir':return False
 if section=='kafi':return bool(re.fullmatch(r'/Audio/kafi/(?:kafi kotobe arbae|kafi [1-9][0-9]{0,2})\.mp3',p))
 if section=='nahj_audio':return bool(re.fullmatch(r'/Audio/nahj-al-balaghe/tartibi/(?:khotbe/khotbe|name/name|hekmat/hekmat) [A-Za-z0-9. &]+\.mp3',p))
 if section=='videos':return bool(re.fullmatch(r'/Video/video-clip/video-clip [1-9][0-9]{0,4}\.mp4',p))
 return False

def media_url(value):
 u=url_parts(value);require(u.netloc==urllib.parse.urlsplit(ORIGIN).netloc and re.fullmatch('/media/'+UUID,u.path),'unapproved image URL');return u.path.split('/')[-1]

def image_ext(raw):
 require(0<len(raw)<=IMAGE_MAX,'image too large/empty')
 if raw.startswith(b'\x89PNG\r\n\x1a\n'):return '.png'
 if raw.startswith(b'\xff\xd8\xff'):return '.jpg'
 if raw[:4]==b'RIFF' and raw[8:12]==b'WEBP':return '.webp'
 raise ValueError('invalid image magic')

def archive(manifest,root,read_media):
 require(type(manifest) is dict and manifest.get('schema')==1 and type(manifest.get('revision')) is int and manifest['revision']>=0,'invalid manifest');rev=manifest['revision'];items=manifest.get('items');require(type(items) is list and len(items)<=3000,'invalid item list')
 root=pathlib.Path(root);latest=root/'latest.json';prior=json.loads(latest.read_bytes()) if latest.exists() else None
 if prior:require(prior.get('scope')=='all-seven-v1' and rev>=prior['revision'],'revision rollback or wrong scope')
 staged={};seen=set();hashes={}
 def stage(rel,raw):
  require(rel not in staged or staged[rel]==raw,'conflicting staged data');staged[rel]=raw
 def attach_image(x,field):
  url=x[field];ident=media_url(url)
  oldpath=root/'items'/f"{x['id']}.json";old=json.loads(oldpath.read_bytes()) if oldpath.exists() else None
  if old and old.get(field)==url:
   rel=old[field+'Path'];require(re.fullmatch(r'media/[a-f0-9]{64}\.(?:png|jpg|webp)',rel),'bad archived media path');raw=(root/rel).read_bytes();require(sha(raw)==old[field+'Sha256'],'archived image changed')
  else:raw=read_media(ident);rel='media/'+sha(raw)+image_ext(raw)
  x[field+'Path']=rel;x[field+'Sha256']=sha(raw);stage(rel,raw)
 for item in items:
  require(type(item) is dict,'bad item');ident=item.get('id');sec=item.get('section');title=item.get('title');ir=item.get('revision')
  require(isinstance(ident,str) and re.fullmatch(UUID,ident) and ident not in seen,'bad/duplicate id');require(sec in SECTIONS and isinstance(title,str) and 2<=len(title.strip())<=180,'bad section/title');require(type(ir) is int and 1<=ir<=rev,'bad item revision');seen.add(ident)
  x={'id':ident,'section':sec,'title':title.strip(),'revision':ir}
  if sec=='guest_sentence_new':
   for field in ('arabic','persian'):
    t=item.get(field);require(isinstance(t,str) and 3<=len(t.strip())<=3500,'bad sentence');x[field]=t
  else:
   x['url']=item['url']
   if sec=='photo_quotes':attach_image(x,'url')
   else:
    require(valid_link(x['url'],sec),'bad content link')
    if sec=='videos' and item.get('coverUrl'):x['coverUrl']=item['coverUrl'];attach_image(x,'coverUrl')
  raw=encode(x);stage('items/'+ident+'.json',raw);hashes[ident]=sha(raw)
 texts=manifest.get('transcripts',{});require(type(texts) is dict,'invalid transcript map');text_hashes={};by_id={x['id']:x for x in items}
 for ident,t in texts.items():
  row=by_id.get(ident);require(row is not None and row['section'] in {'nahj_audio','towhid','see_god','kafi'},'invalid transcript target');require(type(t) is dict and type(t.get('revision')) is int and row['revision']<=t['revision']<=rev,'invalid transcript revision');value=t.get('text');require(isinstance(value,str) and value.strip() and '\0' not in value and len(value.encode())<=128*1024,'invalid transcript text');raw=encode({'id':ident,'revision':t['revision'],'text':value});digest=sha(raw);stage('transcripts/'+digest+'.json',raw);text_hashes[ident]=digest
 snapshot={'schema':1,'scope':'all-seven-v1','source':ORIGIN+'/api/manifest','revision':rev,'updatedAt':manifest.get('updatedAt'),'activeIds':[x['id'] for x in items],'itemSha256':hashes}
 if 'transcripts' in manifest:snapshot['transcriptSha256']=text_hashes
 raw=encode(snapshot);stage(f'revisions/{rev:08d}.json',raw)
 # Validate immutable files BEFORE any write. A same-revision difference is an error.
 for rel,value in staged.items():
  p=root/rel
  if p.exists():require(p.read_bytes()==value,'immutable archive changed: '+rel)
 if prior and rev==prior['revision']:require(latest.read_bytes()==raw,'same revision differs')
 for rel,value in staged.items():
  p=root/rel
  if not p.exists():p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
 latest.parent.mkdir(parents=True,exist_ok=True);tmp=latest.with_suffix('.tmp');tmp.write_bytes(raw);tmp.replace(latest)
 return snapshot

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):raise ValueError('redirect refused')
def get(url,limit):
 req=urllib.request.Request(url,headers={'User-Agent':'MoullaArchive152/1'});
 with urllib.request.build_opener(NoRedirect).open(req,timeout=25) as r:
  require(r.status==200,'HTTP error');raw=r.read(limit+1);require(len(raw)<=limit,'response too large');return raw

def main():
 p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--manifest',type=pathlib.Path);g.add_argument('--fetch',action='store_true');p.add_argument('--media-dir',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('owner-content/all-v152'));args=p.parse_args()
 if args.fetch:raw=get(ORIGIN+'/api/manifest',MAX);reader=lambda i:get(ORIGIN+'/media/'+i,IMAGE_MAX)
 else:
  raw=args.manifest.read_bytes();require(len(raw)<=MAX,'manifest too large')
  def reader(i):
   require(args.media_dir is not None,'offline image directory required');return (args.media_dir/i).read_bytes()
 result=archive(json.loads(raw),args.output,reader);print('Archived revision',result['revision'],len(result['activeIds']),'items. No push or deployment performed.')
if __name__=='__main__':main()
