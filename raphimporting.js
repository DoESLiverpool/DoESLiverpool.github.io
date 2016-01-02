
var SVGfileprocess = function(fname, fnum, fadivid) 
{
    this.fname = fname; 
    this.fnum = fnum; 
    this.fadivid = fadivid; 
    this.state = "constructed"; 
    this.bcancelIm = false; 
    this.dfprocessstatus = "div#"+this.fadivid+" .fprocessstatus"; 

    // after importing:
    // this.rlistb = [ ]; 
    // this.spnumlist = [ ]; 
    // this.spnummap = { }; 
    // this.btunnelxtype
}

SVGfileprocess.prototype.WorkOutPixelScale = function() 
{
    var sheight = this.tsvg.attr("height"); 
    var swidth = this.tsvg.attr("width"); 
    var viewBox = []; // (seemingly unable to lift the viewBox as an attribute)
    this.txt.replace(/viewBox="(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)/g, 
        function(a, x, y, w, h) { 
            viewBox.push(parseFloat(x), parseFloat(y), parseFloat(w), parseFloat(h)); 
    }); 

    console.log("facts:" + sheight+"  "+swidth + "  "+viewBox); 
    var mmheight, mmwidth; 
    if (sheight != undefined) {
        console.assert(sheight.match(/.*?(mm|in)$/g)); 
        mmheight = parseFloat(sheight) * (sheight[sheight.length-1] == 'n' ? 25.4 : 1); 
    }
    if (swidth != undefined) {
        console.assert(swidth.match(/.*?(mm|in)$/g)); 
        mmwidth = parseFloat(swidth) * (swidth[swidth.length-1] == 'n' ? 25.4 : 1); 
    }
    
    var inkscapedefaultmmpix = 90/25.4; 
    if (viewBox.length != 0) {
        this.mmpixwidth = viewBox[2]/mmwidth; 
        this.mmpixheight = viewBox[3]/mmheight; 
    } else {
        this.mmpixwidth = inkscapedefaultmmpix; 
        this.mmpixheight = inkscapedefaultmmpix; 
    }
    console.log("pixscaleX "+this.mmpixwidth+"  pixscaleY "+this.mmpixheight); 
    $("#mmpixwidth").val(this.mmpixwidth); 
    $("#mmpixwidth").change(); 
}
    
SVGfileprocess.prototype.processSingleSVGpath = function(d, cmatrix, stroke, cc)
{
    var dtrans = Raphael.mapPath(d, cmatrix); // Raphael.transformPath(d, raphtranslist.join("")); 
    if (dtrans.length <= 1)
        return; 

    var cclass; 
    if (this.btunnelxtype) {
        cclass = cc.attr("class"); 
        if ((this.mclassstyle[cclass]["dlinestyle"] == "OSA") || (this.mclassstyle[cclass]["dlinestyle"] == "CCA"))
            return; 
    } else {
        if ((stroke == "none") || (stroke === undefined)) 
            return; 
        cclass = stroke; 
    }
    
    // convert all to extended classes with these strokes in?
    if (this.spnummap[cclass] === undefined) {
        var strokecolour = stroke; 
        var fillcolour = null; 
        var spnumobj, stitle; 
        if (this.btunnelxtype) {
            fillcolour = Raphael.getColor(1.0); 
            spnumobj = { spnum:this.spnumlist.length, strokecolour:strokecolour, fillcolour:fillcolour, subsetname:this.mclassstyle[cclass]["dsubsetname"], linestyle:this.mclassstyle[cclass]["dlinestyle"] }; 
            stitle = spnumobj.subsetname+"-"+spnumobj.linestyle; 
        } else {
            spnumobj = { spnum:this.spnumlist.length, strokecolour:strokecolour }; 
            stitle = strokecolour; 
        }
        this.spnummap[cclass] = spnumobj.spnum; 
        this.spnumlist.push(spnumobj); 
        if (!this.btunnelxtype || (spnumobj.linestyle == "Wall")) {
            $('div#'+this.fadivid+' .spnumcols').append($('<span class="spnum'+spnumobj.spnum+'" title="'+stitle+'">'+('X')+'</span>').css("background", fillcolour||strokecolour)); 
            $('div#'+this.fadivid+' .spnumcols span.spnum'+spnumobj.spnum).click(function() {
                if ($(this).hasClass("selected")) 
                    $(this).removeClass("selected"); 
                else
                    $(this).addClass("selected"); 
            });
        }
    }
    var spnum = this.spnummap[cclass]; 
    var spnumobj = this.spnumlist[spnum]; 
    var strokecolour = spnumobj.strokecolour; 
    
    var i0 = 0; 
    var mi = 0; 
    while (i0 < dtrans.length) {
        var i1 = i0 + 1; 
        while ((i1 < dtrans.length) && (dtrans[i1][0] != "M"))
            i1++; 
        // this is the place to separate out the paths by M positions
        var path = paper1.path(dtrans.slice(i0, i1)); 
        path.attr({stroke:strokecolour, "stroke-width":2.0}); 
        rlist.push(path); 
        this.rlistb.push({path:path, spnum:spnum, d:d, mi:mi, cmatrix:cmatrix}); 
        
        i0 = i1; 
        mi++; 
    }
}

SVGfileprocess.prototype.importSVGpathR = function() 
{
    while (this.cstack.length == this.pback.pos) 
        this.pback = this.pstack.pop(); 
    if (this.cstack.length == 0) {
        return false; 
    }
    var cc = this.cstack.pop(); 
    var tag = cc.prop("tagName").toLowerCase(); 
    var raphtranslist = this.pback.raphtranslist; 
    var cmatrix = this.pback.cmatrix; 
    if (cc.attr("transform")) {
        raphtranslist = raphtranslist.slice(); 
        raphtranslist.push(cc.attr("transform").replace(/([mtrs])\w+\s*\(([^\)]*)\)/gi, function(a, b, c) { return b.toLowerCase()+c+(b.match(/s/i) ? ",0,0" : ""); } )); 
        cmatrix = paper1.path().transform(raphtranslist.join("")).matrix; 
    }

    var strokelist = this.pback.strokelist; 
    var cclass = cc.attr("class"); 
    var cstroke = cc.attr("stroke") || cc.css("stroke") || (this.mclassstyle[cclass] && this.mclassstyle[cclass]["stroke"]); 
    if (cstroke) {
        strokelist = strokelist.slice(); 
        strokelist.push(cstroke); 
    } else {
        cstroke = strokelist[strokelist.length - 1]; 
    }

    if (tag == "title") {
        this.btunnelxtype = (cc.text().match(/TunnelX/) != null); 
        if (this.btunnelxtype) 
            console.log("Detected TunnelX type"); 
    } else if (tag == "pattern") {
        console.log("skip pattern"); 
    } else if (tag == "clippath") {
        console.log("skip clippath"); // will deploy Raphael.pathIntersection(path1, path2) eventually
        // <clipPath id="cp1"> <path d="M497.7 285.2 Z"/></clipPath>
        // then clippath="url(#cp1)" in a path for a trimmed symbol type
    } else if ((tag == "polygon") || (tag == "polygline")) {
        var ppts = cc.attr("points").split(/\s+|,/);
        var x0 = ppts.shift(); 
        var y0 = ppts.shift();
        var d = 'M'+x0+','+y0+'L'+ppts.join(' ')+(tag == "polygon" ? "Z" : ""); 
        this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "circle") {
        var cx = parseFloat(cc.attr("cx"));
        var cy = parseFloat(cc.attr("cy")); 
        var r = parseFloat(cc.cattr("r")); 
        var d = "M"+(cx-r)+","+cy+"A"+r+","+r+",0,0,1,"+cx+","+(cy-r)+"A"+r+","+r+",0,1,1,"+(cx-r)+","+cy; 
        this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "rect") {
        var x0 = parseFloat(cc.attr("x"));
        var y0 = parseFloat(cc.attr("y")); 
        var x1 = x0 + parseFloat(cc.attr("width")); 
        var y1 = y0 + parseFloat(cc.attr("height")); 
        var d = "M"+x0+","+y0+"L"+x0+","+y1+" "+x1+","+y1+" "+x1+","+y0+"Z"; 
        if (!this.btunnelxtype)
            this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "path") {
        this.processSingleSVGpath(cc.attr("d"), cmatrix, cstroke, cc); 
    } else {
        this.pstack.push(this.pback); 
        this.pback = { pos:this.cstack.length, raphtranslist:raphtranslist, strokelist:strokelist, cmatrix:cmatrix }; 
        var cs = cc.children(); 
        for (var i = cs.length - 1; i >= 0; i--) 
            this.cstack.push($(cs[i]));   // in reverse order for the stack
    }
    $(this.dfprocessstatus).text(this.rlistb.length+"/"+this.cstack.length); 
    return true; 
}

SVGfileprocess.prototype.InitiateLoadingProcess = function(txt) 
{
    // NB "stroke" actually means colour in SVG lingo
    this.state = "loading"; 
    this.txt = txt; 
    this.tsvg = $($(txt).children()[0]).parent(); // seems not to work directly as $(txt).find("svg")
    this.WorkOutPixelScale();  

    this.timeoutcyclems = 10; 
    this.pback = {pos:-1, raphtranslist:[""], strokelist:[undefined], cmatrix:Raphael.matrix() };
    this.pstack = [ ]; 
    this.cstack = [ this.tsvg ]; 
    this.mclassstyle = { }; 
    var mclassstyle = this.mclassstyle; 
    this.tsvg.find("style").text().replace(/\.([\w\d\-]+)\s*\{([^}]*)/gi, function(a, b, c) { 
        mclassstyle[b] = { }; 
        c.replace(/([^:;]*):([^:;]*)/gi, function(a1, b1, c1) { 
            var c11 = c1.trim(); 
            if ((c11.length != 0) && (c11[0] == '"') && (c11[c11.length-1] == '"'))
                c11 = c11.slice(1, -1); 
            mclassstyle[b][b1.trim().toLowerCase()] = c11; 
        }); 
    }); 
    console.log(mclassstyle); 
    
    this.rlistb = [ ]; 
    this.spnumlist = [ ]; 
    this.spnummap = { }; // maps into the above from concatinations of subset and strokecolour
    this.btunnelxtype = false;  // till it gets set on loading
    
    // autorun the group process (should distinguish easy cases)
    if (txt.length < 10000)
        $("div#"+this.fadivid+" .groupprocess").addClass("selected"); 
    
    this.state = "importsvgr"; 
    var outerthis = this; 
    function importSVGpathRR() {
        if (outerthis.bcancelIm) {
            $(this.dfprocessstatus).text("CANCELLED"); 
            outerthis.state = "cancelledimportsvgr"; 
        } else if (outerthis.importSVGpathR()) {
            setTimeout(importSVGpathRR, outerthis.timeoutcyclems); 
        } else {
            outerthis.state = "doneimportsvgr"; 
            if ($("div#"+outerthis.fadivid+" .groupprocess").hasClass("selected"))
                outerthis.processimportedSVG(); 
        }
    }
    importSVGpathRR(); 
}

function ProcessToPathGroupingsTunnelX(rlistb, spnumlist)
{
    var subsetnamemaps = { }; 
    for (var i = 0; i < rlistb.length; i++) {
        var spnumobj = spnumlist[rlistb[i].spnum]; 
        if (spnumobj.linestyle == "subsetarea") {
            var subsetname = spnumobj.subsetname; 
            if (subsetnamemaps[subsetname] === undefined) 
                subsetnamemaps[subsetname] = [ ]; 
            subsetnamemaps[subsetname].push([i*2+1]); 
        }
    }

    var subsetnames = Object.keys(subsetnamemaps); 
    res = [ ]; 
    for (var i = 0; i < subsetnames.length; i++) {
        var lres = subsetnamemaps[subsetnames[i]]; 
        lres.push([]); // the list of engraving edges
        res.push(lres); 
    }

    // engraving edge groups
    for (var i = 0; i < rlistb.length; i++) {
        var spnumobj = spnumlist[rlistb[i].spnum]; 
        if (spnumobj.linestyle != "subsetarea") {
            var subsetname = spnumobj.subsetname; 
            if (subsetnamemaps[subsetname] !== undefined) 
                subsetnamemaps[subsetname][subsetnamemaps[subsetname].length-1].push(i); 
        }
    }

    console.log("resresX", res); 
    return res; 
}

function ProcessToPathGroupings(rlistb, closedist, spnumscp)
{
    // form the closed path sequences per spnum
    var jdseqs = [ ];  // indexes dlist
    for (var ispnum = 0; ispnum < spnumscp.length; ispnum++) {
        var spnum = spnumscp[ispnum]; 
        $(this.dfprocessstatus).text("joining spnum="+spnum); 
        var dlist = [ ]; 
        var npathsc = 0; 
        for (var i = 0; i < rlistb.length; i++) {
            dlist.push(rlistb[i].spnum == spnum ? rlistb[i].path.attrs.path : null); 
            npathsc++; 
        }
        var ljdseqs = PolySorting.FindClosedPathSequencesD(dlist, closedist); 
        var npathsleft = 0; 
        for (var i = 0; i < ljdseqs.length; i++)
            npathsleft += ljdseqs[i].length; 
        //console.log("ljdseqs", spnum, "joined", npathsc, "left", npathsleft);  // could use not-joined paths as a guess of which colours to filter as engravings
        jdseqs = jdseqs.concat(ljdseqs); 
    }
    // jdseqs = [ [i1, i2, i3,...] sequence of dlist[ii/2|0], bfore=((ii%2)==1 ]

    // list of paths not included in any cycle
    $(this.dfprocessstatus).text("getsingletlist"); 
    var singletslist = PolySorting.GetSingletsList(jdseqs, dlist.length)

    // build the dlist without any holes parallel to rlistb to use for groupings
    var dlist = [ ]; 
    for (var i = 0; i < rlistb.length; i++) 
        dlist.push(rlistb[i].path.attrs.path); 
    $(this.dfprocessstatus).text("concat JDgeoseqs"); 
    var jdgeos = [ ]; 
    for (var i = 0; i < jdseqs.length; i++) {
        jdgeos.push(PolySorting.JDgeoseq(jdseqs[i], dlist)); // concatenated sequences of paths forming the boundaries
    }

    // groups of jdsequences forming outercontour, islands, singlets 
    $(this.dfprocessstatus).text("FindAreaGroupingsD"); 
    var res = [ ]; 
    var cboundislands = PolySorting.FindAreaGroupingsD(jdgeos); 
    
    $(this.dfprocessstatus).text("oriented islands"); 
    for (var j = 0; j < cboundislands.length; j++) {
        var lres = [ ]; 
        var cboundisland = cboundislands[j]; 
        for (var ci = 0; ci < cboundisland.length; ci++) {
            var i = cboundisland[ci]; 
            var jdgeo = jdgeos[i]; 
            var bfore = PolySorting.FindPathOrientation(jdgeo); 
            var jdseq = (((ci == 0) == bfore) ? jdseqs[i] : PolySorting.RevJDseq(jdseqs[i])); 
            lres.push(jdseq); 
        }
        lres.push([ ]); // the slot for the list of singlet paths
        res.push(lres); 
    }
    
    $(this.dfprocessstatus).text("singlets to groupings"); 
    for (var i = 0; i < singletslist.length; i++) {
        var ic = singletslist[i]; 
        var dpath = dlist[ic]; 
        var j = PolySorting.SingletsToGroupingsD(dpath, cboundislands, jdgeos); 
        if (j != -1)
            res[j][res[j].length-1].push(ic); 
    }

    console.log("resres", res); 
    return res; 
}

SVGfileprocess.prototype.processimportedSVG = function()
{
    // could this be converted into a callback
    var closedist = 3.2; 

    var spnumscp = [ ]; 
    $('div#'+this.fadivid+' .spnumcols span').each(function(i, v)  { 
        if (!$(v).hasClass("selected"))
            spnumscp.push(parseInt($(v).attr("class").match(/\d+/g)[0]));  // spnum(\d+) 
    }); 
    console.log("hghghg", spnumscp); 
    
    // lists of indexes into rlistb specifying the linked boundaries and islands (*2+(bfore?1:0)), and engraving lines in the last list
    var pathgroupings = (this.btunnelxtype ? ProcessToPathGroupingsTunnelX(this.rlistb, this.spnumlist) : ProcessToPathGroupings(this.rlistb, closedist, spnumscp)); 
    
    $(this.dfprocessstatus).text("doneG"); 

    // rebuild this groupings directly from the above indexing sets
    var dlist = [ ]; 
    for (var i = 0; i < this.rlistb.length; i++) 
        dlist.push(this.rlistb[i].path.attrs.path); 

    var Lgrouppaths = [ ]; 
    for (var k = 0; k < pathgroupings.length; k++) {
        var pathgrouping = pathgroupings[k]; 
        
        // form the area object
        var dgroup = [ ]; 
        var fillcolour = (this.btunnelxtype ? this.spnumlist[this.rlistb[pathgrouping[0][0]/2|0].spnum].fillcolour : "#0f0"); 
        for (var j = 0; j < pathgrouping.length - 1; j++) {
            dgroup = dgroup.concat(PolySorting.JDgeoseq(pathgrouping[j], dlist)); 
        }
        var pgroup = paper1.path(dgroup); 
        pgroup.attr({stroke:"white", fill:fillcolour, "fill-opacity":"10%"}); 
        
        // form the list of all paths belonging to this area object
        var lpaths = [ pgroup ]; 
        var engpaths = pathgrouping[pathgrouping.length - 1]; 
        for (var i = 0; i < engpaths.length; i++)
            lpaths.push(this.rlistb[engpaths[i]].path); 
        for (var j = 0; j < pathgrouping.length - 1; j++) {
            for (var i = 0; i < pathgrouping[j].length; i++)
                lpaths.push(this.rlistb[pathgrouping[j][i]/2|0].path); 
        }

        // localize for drag function
        (function(pgroup, lpaths) {
            var brotatemode = false; 
            var cx = 0, cy = 0; 
            pgroup.drag(
                function(dx, dy) { 
                    var tstr = (brotatemode ? "r"+(dx*0.5)+","+cx+","+cy : "t"+(dx*paper1scale)+","+(dy*paper1scale)); 
                    $.each(lpaths, function(i, path) { 
                        path.transform(tstr); 
                    }); 
                }, 
                function(x, y, e)  { 
                    brotatemode = e.ctrlKey; 
                    pathselected = pgroup; 
                    var bbox = pgroup.getBBox(); 
                    cx = (bbox.x + bbox.x2)/2; 
                    cy = (bbox.y + bbox.y2)/2; 
                }, 
                function() { 
                    $.each(lpaths, function(i, path) { 
                        path.attr("path", Raphael.mapPath(path.attr("path"), path.matrix)); 
                        path.transform("t0,0") 
                    }); 
                }
            ); 
        })(pgroup, lpaths); 
    }; 
}

