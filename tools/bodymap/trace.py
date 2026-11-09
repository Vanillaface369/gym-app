import cv2, numpy as np, json, sys
X0,Y0,X1,Y1 = 150,430,740,1620   # figure area; excludes UI text and the rotate button (x<130)
out={}
def smooth(c):
    # Simplify the pixel outline, then one Chaikin pass to round off the stair-steps.
    p=cv2.approxPolyDP(c,1.2,True).reshape(-1,2).astype(float)
    q=[]
    for i in range(len(p)):
        a,b=p[i],p[(i+1)%len(p)]
        q.append(0.75*a+0.25*b); q.append(0.25*a+0.75*b)
    return [[round(x*2)/2, round(y*2)/2] for x,y in q]
for n in ['front','back']:
    im=cv2.imread(n+'.webp', cv2.IMREAD_GRAYSCALE)
    roi=np.zeros_like(im); roi[Y0:Y1,X0:X1]=im[Y0:Y1,X0:X1]
    body=((roi>40)).astype(np.uint8)*255
    body=cv2.morphologyEx(body, cv2.MORPH_OPEN, np.ones((3,3),np.uint8))
    musc=((roi>105)).astype(np.uint8)*255
    musc=cv2.morphologyEx(musc, cv2.MORPH_OPEN, np.ones((3,3),np.uint8))
    bc,_=cv2.findContours(body, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    bc=[c for c in bc if cv2.contourArea(c)>5000]
    mc,_=cv2.findContours(musc, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    mc=[c for c in mc if cv2.contourArea(c)>80]
    vis=cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
    items=[]
    for i,c in enumerate(mc):
        M=cv2.moments(c); cx,cy=M['m10']/M['m00'],M['m01']/M['m00']
        items.append(dict(i=i,cx=round(cx),cy=round(cy),area=int(cv2.contourArea(c)),pts=smooth(c)))
        cv2.drawContours(vis,[c],-1,(0,0,255),1)
        cv2.putText(vis,str(i),(int(cx)-8,int(cy)+5),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,90,255),1)
    out[n]=dict(body=[smooth(c) for c in bc], muscles=items)
    cv2.imwrite(n+'_labels.png', vis[Y0:Y1, X0:X1])
    print(n, 'body contours', len(bc), [int(cv2.contourArea(c)) for c in bc], 'muscles', len(mc), 'points', sum(len(m['pts']) for m in items))
json.dump(out, open('trace.json','w'))
