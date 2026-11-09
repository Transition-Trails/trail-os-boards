import hashlib,sys,re
d=sys.argv[1] if len(sys.argv)>1 else '.'
css=open(d+'/base.css').read()+'\n'+open(d+'/extra.css').read()
js=open(d+'/app.js').read()
html=open(d+'/shell.html').read().replace('/*CSS*/',css).replace('/*JS*/',js)
def ent(s):return ''.join(c if ord(c)<128 else '&#%d;'%ord(c) for c in s)
def esc(s):
  o=[]
  for c in s:
    n=ord(c)
    if n<128:o.append(c)
    elif n<0x10000:o.append('\\u%04x'%n)
    else:
      n-=0x10000;o.append('\\u%04x\\u%04x'%(0xD800+(n>>10),0xDC00+(n&0x3FF)))
  return ''.join(o)
i=html.index('<script>');j=html.rindex('</script>')
out=ent(html[:i])+'<script>'+esc(html[i+8:j])+ent(html[j:])
assert '<form' not in out.lower()
assert 'var BOARD="program-studio",BOARD_VERSION=1,CONTRACT=1;' in out
assert 'googleapis' not in out and '<script src' not in out
out.encode('ascii')
open(d+'/../program-studio-board.html','w').write(out)
b=out.encode()
print(len(b),hashlib.sha256(b).hexdigest())
