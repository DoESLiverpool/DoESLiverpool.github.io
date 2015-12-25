
function FindPathOrientation(darea)
{
    var iL = 1; 
    for (var i = 1; i < darea.length; i++) {
        if (darea[i][darea[i].length - 2] < darea[iL][darea[iL].length - 2]) {
            iL = i; 
        }
    }
    var x = darea[iL][darea[iL].length - 2]; 
    var y = darea[iL][darea[iL].length - 1]; 
    var xf, yf, xb, yb; 
    var iF = iL + 1; 
    while (iF != iL) {
        if (iF == darea.length)
            iF = 0; 
        xF = darea[iF][darea[iF].length - 2]; 
        yF = darea[iF][darea[iF].length - 1]; 
        if ((xF != x) || (yF != y))
            break; 
        iF++; 
    }
    var iB = iL - 1; 
    while (iB != iL) {
        if (iB == -1) {
            iB = darea.length - 1; 
            if (iB == iL)
                break; 
        }
        xB = darea[iB][darea[iB].length - 2]; 
        yB = darea[iB][darea[iB].length - 1]; 
        if ((xB != x) || (yB != y))
            break; 
        iB--; 
    }
        
    var vxF = xF - x;  
    var vyF = yF - y;  
    console.assert(vxF >= 0.0); 
    var diamondF = vyF / (Math.abs(vyF) + vxF); 
    var vxB = xB - x;  
    var vyB = yB - y;  
    console.assert(vxB >= 0.0); 
    var diamondB = vyB / (Math.abs(vyB) + vxB); 
    return diamondB <= diamondF; 
}


var Djdseqs; 
function FindClosedPathSequencesD(dlist, closedist)
{
    // create arrays of closest links
    var closedistSq = closedist*closedist; 
    var rlends = [ ]; // [ x, y, i, bfore ]
    var rlidat = [ ]; // index*2 front back
    Drlends = rlends; 
    Drlidat = rlidat; 
    for (var i = 0; i < dlist.length; i++) {
        var pseq = dlist[i]; 
        var seg0 = pseq[0]; 
        rlends.push([ seg0[1], seg0[2], i, false ]); 
        var segE = pseq[pseq.length - 1]; 
        rlends.push([ segE[segE.length-2], segE[segE.length-1], i, true ]); 
        rlidat.push([ ], [ ]); // each will be a list of cross connections [d, j]
    } 
    rlends.sort(); 
    
    var rlconns = 0; 
    for (var j = 0; j < rlends.length - 1; j++) {
        var rle = rlends[j]; 
        var xB = rle[0]; 
        var yB = rle[1]; 
        var jd = rle[2]*2 + (rle[3] ? 1 : 0); 
        for (var j1 = j+1; ((j1 < rlends.length) && (rlends[j1][0] <= xB + closedist)); j1++) {
            var rle1 = rlends[j1]; 
            var dx = rle1[0] - xB;
            var dy = rle1[1] - yB; 
            var dCsq = dx*dx + dy*dy; 
            if (dCsq <= closedistSq) {
                var jd1 = rle1[2]*2 + (rle1[3] ? 1 : 0); 
                rlidat[jd].push([dCsq, jd1]); 
                rlidat[jd1].push([dCsq, jd]); 
                rlconns++; 
            }
        }
    }

    // sort adjacencies at endpoints by distance
    for (var j = 0; j < rlidat.length - 1; j++) {
        rlidat[j].sort(); 
    }

    function disconnectJD1(jd, jd1) {
        var rlid1 = rlidat[jd1]; 
        //console.log("disconjd", jd, jd1, rlid1.slice()); 
        var d1i; 
        for (d1i = rlid1.length - 1; d1i >= 0; d1i--) {
            if (rlid1[d1i][1] == jd)
                break; 
        }
        for (++d1i ; d1i < rlid1.length; d1i++)
            rlid1[d1i-1] = rlid1[d1i]; 
        rlid1.pop(); 
    }
    
    // extract closed sequences of paths that join up
    var jdseqs = [ ];  
    var i = 0; 
    var Dloops = rlconns*2 + dlist.length; 
    while (i < dlist.length) {
        console.assert(Dloops-- >= 0); 
        if (rlidat[i*2].length == 0) {
            if (rlidat[i*2 + 1].length == 0) {
                i++; 
            } else {
                var jd = i*2 + 1; 
                while (rlidat[jd].length != 0) {
                    disconnectJD1(jd, rlidat[jd].pop()[1]); 
                }
            }
        } else if (rlidat[i*2 + 1].length == 0) {
            var jd = i*2; 
            while (rlidat[jd].length != 0) {
                disconnectJD1(jd, rlidat[jd].pop()[1]); 
            }
        } else {
            var jdseq = [ ]; 
            var jd0 = i*2 + 1; 
            var jd = jd0; 
            while (true) {
                if (rlidat[jd].length == 0) {
                    var jdl = jdseq.pop(); 
                    //console.log("removing jdl", jdl, jd0); 
                    disconnectJD1(jdl, rlidat[jdl].shift()[1]); 
                    break; 
                } else if (jdseq.length > dlist.length - i*0) {
                    //console.log("removing jd0 semiloop", jd0); 
                    disconnectJD1(jd0, rlidat[jd0].shift()[1]); 
                    break; 
                } else {
                    jdseq.push(jd); 
                    var jd1 = rlidat[jd][0][1];
                    jd = jd1 + ((jd1%2) == 1 ? -1 : 1); 
                    if (jd == jd0) 
                        break; 
                }
            }
            if (jd == jd0) {
                //console.log("found cycle", jdseq); 
                jdseqs.push(jdseq); 
                for (var ijd = 0; ijd < jdseq.length; ijd++) {
                    var jd = jdseq[ijd]; 
                    while (rlidat[jd].length != 0) {
                        disconnectJD1(jd, rlidat[jd].pop()[1]); 
                    }
                    jd1 = jd + ((jd%2) == 1 ? -1 : 1); 
                    while (rlidat[jd1].length != 0) {
                        disconnectJD1(jd1, rlidat[jd1].pop()[1]); 
                    }
                }
                i++; 
            } 
        }
    }
    return jdseqs; 
}

