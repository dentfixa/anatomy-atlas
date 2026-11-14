import asyncio,sys,time
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18931/'
OUT=sys.argv[2] if len(sys.argv)>2 else 'shots/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':1400,'height':900})
        logs=[]; pg.on('console',lambda m: logs.append(m.type+': '+m.text)); pg.on('pageerror',lambda e: logs.append('PAGEERR '+str(e)))
        t=time.time(); await pg.goto(URL); await pg.wait_for_function('window.__ready===true',timeout=300000); print('ready',round(time.time()-t,1))
        await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'01_all_layers.png')
        row=lambda i: f'#layers .layer:nth-child({i})'
        # UI: isolate muscle (row 3), bone (row 5)
        await pg.click(row(3)+' .iso'); await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'02_muscle_only.png')
        await pg.click(row(5)+' .iso'); await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'03_bone_only.png')
        await pg.click('#btnUndo'); await pg.wait_for_timeout(300); await pg.click('#btnUndo'); await pg.wait_for_timeout(1000)
        st=await pg.evaluate("atlas.LAYERS.map(l=>l.id+':'+l.visible).join(' ')"); print('after 2x undo:',st)
        # fade skin+hair via slider
        for i in (1,2):
            await pg.fill(row(i)+' input[type=range]','25'); await pg.dispatch_event(row(i)+' input[type=range]','input')
        await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'04_skin_faded.png')
        # clip
        await pg.click('#btnClip'); await pg.check('.cliprow[data-axis=x] input[type=checkbox]'); await pg.click('#views button[data-view=left]')
        await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'05_clip_sagittal.png')
        await pg.uncheck('.cliprow[data-axis=x] input[type=checkbox]'); await pg.check('.cliprow[data-axis=y] input[type=checkbox]')
        await pg.fill('.cliprow[data-axis=y] input[type=range]','560'); await pg.dispatch_event('.cliprow[data-axis=y] input[type=range]','input')
        await pg.click('#views button[data-view=top]'); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'06_clip_axial.png')
        await pg.uncheck('.cliprow[data-axis=y] input[type=checkbox]'); await pg.click('#btnClip')
        # select by real click on face (masseter area) in head view
        await pg.click('#btnReset'); await pg.wait_for_timeout(800)
        await pg.click(row(2)+' .eye'); await pg.click(row(1)+' .eye'); await pg.click('#views button[data-view=head]'); await pg.wait_for_timeout(1500)
        await pg.mouse.click(612,566); await pg.wait_for_timeout(800)
        print('clicked:', await pg.evaluate("document.getElementById('cName').textContent"))
        await pg.screenshot(path=OUT+'07_selected.png')
        await pg.click('#aHide'); await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+'07b_after_hide.png')
        # search UI
        await pg.fill('#search','masseter'); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'08a_search_list.png')
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'08_search_result.png')
        # other systems via UI
        await pg.click('#btnReset'); await pg.wait_for_timeout(500)
        for i in (1,2,3): await pg.click(row(i)+' .eye')
        for i in (7,8,9): await pg.click(row(i)+' .eye')
        await pg.wait_for_function("['vessels','nerves','organs'].every(k=>atlas.L[k].loaded)",timeout=300000); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUT+'09_internal_systems.png')
        await pg.click(row(5)+' .eye'); await pg.click('#views button[data-view=head]'); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'10_head_vessels_nerves.png')
        print('\n'.join(l for l in logs if 'error' in l.lower() or 'PAGEERR' in l)[:3000])
        # mobile
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        mp=await ctx.new_page(); await mp.goto(URL); await mp.wait_for_function('window.__ready===true',timeout=300000); await mp.wait_for_timeout(1500)
        await mp.screenshot(path=OUT+'11_mobile.png')
        await mp.tap('#btnPanel'); await mp.wait_for_timeout(500); await mp.screenshot(path=OUT+'12_mobile_panel.png')
        await b.close()
asyncio.run(main())
