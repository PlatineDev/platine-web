// ═══ KNOWLEDGE BASE ═══
const KB={
  cpu:{desc:"Central Processing Unit. On laptops: soldered BGA, not user-replaceable without hot air station. Throttling is the most common issue.",
    faults:[{s:"h",t:"Thermal throttle (sustained <60% performance) — dried paste or clogged heatsink"},{s:"h",t:"No POST — check RAM seating, BIOS corruption, or VCore rail failure"},{s:"m",t:"BSOD WHEA_UNCORRECTABLE_ERROR — voltage instability or memory issue"},{s:"l",t:"Slow under light load — wrong power plan (set Balanced or High Performance)"}],
    terminal:[{label:"Power/throttle report",cmd:"powercfg /energy /output %USERPROFILE%\\Desktop\\energy.html\nstart %USERPROFILE%\\Desktop\\energy.html",desc:"Full energy report. Look for throttle events and high processor utilization warnings."},{label:"Critical errors last 24h",cmd:"Get-WinEvent -FilterHashtable @{LogName='System';Level=1,2;StartTime=(Get-Date).AddHours(-24)} | Select TimeCreated,Message | Format-List",desc:"Lists kernel crashes and errors. Run as Administrator."},{label:"CPU stress 30s",cmd:"$j=Start-Job{while($true){[Math]::Sqrt(1234567890)}};Start-Sleep 30;Stop-Job $j;Remove-Job $j;Write-Host 'Done'",desc:"Stresses all cores to reveal thermal throttling."}],
    bios:[{path:"Advanced → CPU → Intel SpeedStep / AMD Cool'n'Quiet",desc:"MUST be ENABLED. Disabled = CPU at fixed max frequency = overheating.",note:"Most critical CPU BIOS setting"},{path:"Advanced → Power → TDP / Power Limit",desc:"Set to rated CPU TDP. Too low = permanent throttle.",note:"Some OEMs lock below spec"},{path:"Advanced → Thermal → Fan Control",desc:"Set Auto or Full Speed if CPU overheating. Verify fan curve starts early enough.",note:"Check fan response to temperature"}]},
  ram:{desc:"RAM failure causes BSODs, random crashes, instability. Mixed manufacturers can cause dual-channel issues. Single-channel = -35% iGPU performance.",
    faults:[{s:"h",t:"Less RAM than installed — reseat, test each slot with known-good module"},{s:"h",t:"BSOD MEMORY_MANAGEMENT — run MemTest86, 2+ passes"},{s:"m",t:"Random freezes, no BSOD — test one stick at a time"},{s:"l",t:"Single-channel — add matching module for dual-channel (+35% bandwidth)"}],
    terminal:[{label:"Windows Memory Diagnostic",cmd:"mdsched.exe",desc:"Schedule memory test on next reboot. Results in Event Viewer after restart."},{label:"RAM slot details",cmd:"Get-WmiObject Win32_PhysicalMemory | Select DeviceLocator,Capacity,Speed,ConfiguredClockSpeed,Manufacturer,PartNumber | Format-Table",desc:"Shows each slot. Configured speed vs rated speed reveals XMP status."},{label:"Memory pressure",cmd:"Get-Process | Sort-Object WorkingSet -Desc | Select -First 10 Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB,1)}} | Format-Table",desc:"Top 10 RAM consumers. High single-process = possible leak."}],
    bios:[{path:"Advanced → Memory → XMP / DOCP",desc:"Enable XMP (Intel) or DOCP (AMD) to run at rated speed. Default = 2133MHz even if rated 3200+.",note:"Biggest performance BIOS setting"},{path:"Advanced → Memory → Frequency",desc:"Manual speed if XMP unavailable. Use rated value only.",note:"Do not exceed rated spec"},{path:"Advanced → Clear CMOS",desc:"POST hang after RAM change — remove CMOS battery 30s to reset training.",note:"Last resort for detection issues"}]},
  storage:{desc:"SMART data predicts failure before it happens. Reallocated sectors > 0 means the drive is remapping bad areas — replace soon.",
    faults:[{s:"h",t:"SMART FAILING — imminent data loss. BACK UP IMMEDIATELY"},{s:"h",t:"Reallocated sectors > 0 — bad sectors detected. Monitor daily"},{s:"m",t:"Slow boot (>30s) — filesystem errors, run chkdsk"},{s:"l",t:"NVMe at PCIe x2 instead of x4 — check M.2 slot spec in manual"}],
    terminal:[{label:"Check filesystem",cmd:"chkdsk C: /scan\n# Fix on next reboot:\nchkdsk C: /f /r",desc:"/scan is safe. /f /r repairs errors, requires reboot. Run as Administrator."},{label:"Repair system files",cmd:"DISM /Online /Cleanup-Image /RestoreHealth\nsfc /scannow",desc:"Fixes corrupted Windows files. 5-15 minutes. Run as Administrator."},{label:"Disk speed benchmark",cmd:"winsat disk -drive c",desc:"NVMe: >1000MB/s. SATA SSD: >400MB/s. HDD: >80MB/s. Below = problem."},{label:"Check dirty bit",cmd:"fsutil dirty query C:",desc:"Dirty = filesystem not cleanly unmounted. Run chkdsk."}],
    bios:[{path:"Advanced → Storage → SATA Mode",desc:"Must be AHCI. Not IDE or RAID. Changing after Windows install requires registry fix first.",note:"⚠ Change BEFORE installing Windows"},{path:"Advanced → M.2 → PCIe/SATA mode",desc:"NVMe not detected: ensure slot is set to PCIe/NVMe, not SATA-only.",note:"Critical for NVMe detection"},{path:"Boot → Boot Priority",desc:"Set NVMe/SSD as first boot device after storage replacement.",note:"Check after any storage change"}]},
  gpu:{desc:"Integrated GPU shares system RAM. A second RAM stick (dual-channel) increases iGPU bandwidth ~35%. Discrete GPU has dedicated VRAM.",
    faults:[{s:"h",t:"No display — test different cable and monitor first"},{s:"h",t:"Driver TDR crash — clean reinstall with DDU in Safe Mode"},{s:"m",t:"Artifacts or flickering — GPU overheating or VRAM failure"},{s:"l",t:"Low iGPU performance — single-channel RAM detected"}],
    terminal:[{label:"Check GPU driver",cmd:"Get-WmiObject Win32_VideoController | Select Name,DriverVersion,Status | Format-List",desc:"Shows all GPUs and driver versions. 'Error' in Status = driver problem."},{label:"GPU temp (needs LibreHardwareMonitor)",cmd:"Get-WmiObject -Namespace root\\LibreHardwareMonitor -Class Sensor | Where-Object {$_.SensorType -eq 'Temperature'} | Select Name,Value",desc:"Install from librehardwaremonitor.org first."},{label:"Clean driver reinstall (DDU)",cmd:"# 1. Download DDU from guru3d.com\n# 2. Boot Safe Mode\n# 3. Run DDU > Clean and Restart\n# 4. Install fresh driver\nWrite-Host 'Follow steps above'",desc:"Completely removes driver files. Essential for TDR and crash fixes."}],
    bios:[{path:"Advanced → Graphics → Primary Display",desc:"iGFX for iGPU-only. PCIE if discrete GPU. Wrong = black screen on boot.",note:"Critical if dGPU installed"},{path:"Advanced → Graphics → DVMT Pre-Allocated",desc:"Increase shared iGPU memory to 256-512MB for better integrated performance.",note:"Intel iGPU only"},{path:"Advanced → PCIe → PCIe Gen",desc:"Try Gen 3 if dGPU unstable.",note:"Stability fix for some GPU+board combos"}]},
  battery:{desc:"Li-Ion battery. 80% capacity typically remains after 500 full cycles. Swollen = fire hazard, stop charging immediately.",
    faults:[{s:"h",t:"Swollen — STOP CHARGING. Fire risk. Remove and dispose safely"},{s:"h",t:"Health <50% — replace urgently, <1h runtime"},{s:"m",t:"Health 50-75% — replacement recommended"},{s:"l",t:"Fast drain on AC — check charger IC and adapter wattage"}],
    terminal:[{label:"Battery health report",cmd:"powercfg /batteryreport /output %USERPROFILE%\\Desktop\\battery.html\nstart %USERPROFILE%\\Desktop\\battery.html",desc:"Design capacity, full charge capacity, cycle count, usage history."},{label:"Power efficiency",cmd:"powercfg /energy /output %USERPROFILE%\\Desktop\\energy.html\nstart %USERPROFILE%\\Desktop\\energy.html",desc:"What is draining the battery and causing inefficiency."},{label:"Sleep drain analysis",cmd:"powercfg /sleepstudy /output %USERPROFILE%\\Desktop\\sleep.html\nstart %USERPROFILE%\\Desktop\\sleep.html",desc:"Power usage during sleep. Diagnoses overnight drain."}],
    bios:[{path:"Advanced → Power → Battery Charge Threshold",desc:"Set max charge to 80% to extend lifespan ~30%. HP/Lenovo/Dell support this.",note:"HP: BIOS → Power → Battery Care Mode"},{path:"Advanced → Power → Hibernate",desc:"Enable Hibernate over Sleep for long periods unplugged.",note:"Fully powers off, preserves charge"}]},
  network:{desc:"Intel CNVi WiFi is proprietary — only Intel CNVi cards work in CNVi slots. Non-Intel WiFi cards will not be recognized.",
    faults:[{s:"h",t:"WiFi not detected — reseat M.2, reconnect both antenna cables (MHF4)"},{s:"m",t:"Weak signal — antenna cables loose or near interference"},{s:"l",t:"Replacing Intel CNVi with non-Intel — will not work by design"}],
    terminal:[{label:"Full network stack reset",cmd:"netsh winsock reset\nnetsh int ip reset\nipconfig /release\nipconfig /flushdns\nipconfig /renew",desc:"Fixes most 'no internet' issues. Reboot after. Run as Administrator."},{label:"Adapter diagnostics",cmd:"Get-NetAdapter | Select Name,Status,LinkSpeed,MacAddress | Format-Table\nnetsh wlan show interfaces",desc:"Shows all adapters, link speed, WiFi signal strength."},{label:"Connectivity test",cmd:"Test-Connection 8.8.8.8 -Count 3\nResolve-DnsName google.com",desc:"No ping = internet issue. No DNS = DNS issue."}],
    bios:[{path:"Advanced → Wireless → WLAN Controller",desc:"Verify WLAN is ENABLED. Can be accidentally disabled in BIOS.",note:"Check before any hardware diagnosis"},{path:"Advanced → Network → PXE Boot",desc:"Disable if not needed. Speeds up POST significantly.",note:"Safe to disable on non-enterprise"}]},
  audio:{desc:"Audio codec on HDA bus. Controls speakers, headphone jack, and microphone. Driver reinstall fixes most issues.",
    faults:[{s:"h",t:"No audio devices — reinstall driver from manufacturer support site"},{s:"m",t:"Headphone jack not detected — clean with IPA, replace if broken"},{s:"l",t:"Crackling — driver issue, reinstall audio driver"}],
    terminal:[{label:"Restart audio services",cmd:"Stop-Service -Name 'Audiosrv','AudioEndpointBuilder' -Force\nStart-Service -Name 'AudioEndpointBuilder','Audiosrv'",desc:"Fixes 'no audio device' without reboot."},{label:"List audio devices",cmd:"Get-WmiObject Win32_SoundDevice | Select Name,Status,Manufacturer | Format-Table",desc:"Lists all audio devices. Missing = driver not installed."}],
    bios:[{path:"Advanced → Onboard → HD Audio",desc:"Ensure HD Audio is ENABLED. Can be accidentally disabled.",note:"Check first if audio suddenly disappeared"},{path:"Advanced → Audio → Front Panel Type",desc:"Set HD Audio (not AC97) for front panel volume control to work.",note:"AC97 = no volume control on jack"}]},
  psu:{desc:"Desktop PSU converts AC to 12V/5V/3.3V. A failing PSU is often misdiagnosed as CPU or motherboard failure.",
    faults:[{s:"h",t:"Random shutdowns under load — PSU insufficient wattage or failing caps"},{s:"h",t:"Completely dead — test with paperclip test (short green+black on 24-pin)"},{s:"m",t:"USB devices reset — 5V rail unstable"},{s:"m",t:"Won't POST after GPU install — PSU underpowered"}],
    terminal:[{label:"Check power failure events",cmd:"Get-WinEvent -FilterHashtable @{LogName='System';Id=@(41,1001,6008);StartTime=(Get-Date).AddDays(-7)} | Select TimeCreated,Id,Message | Format-List",desc:"Event 41 = unexpected shutdown. Frequent 41s = PSU or power issue."},{label:"Voltage rails (LHM needed)",cmd:"Get-WmiObject -Namespace root\\LibreHardwareMonitor -Class Sensor | Where-Object {$_.SensorType -eq 'Voltage'} | Select Name,Value",desc:"Shows 12V/5V/3.3V. >5% from nominal = failing PSU."}],
    bios:[{path:"Advanced → Power → Restore on AC Loss",desc:"Set behavior after power outage: Last State, Always On, Always Off.",note:"Useful for always-on desktops"},{path:"Advanced → Power → Wake on LAN / RTC",desc:"Disable if phantom boots occur at night.",note:"Common cause of unexpected power-on"}]},
  usb:{desc:"USB controller manages all USB ports. USB 3.x controllers appear separately from USB 2.0. Issues cause devices to randomly disconnect.",
    faults:[{s:"h",t:"All USB ports dead — check USB controller in Device Manager"},{s:"m",t:"USB device random disconnect — power management issue or 5V rail unstable"},{s:"l",t:"USB 3.0 device running at USB 2.0 speed — try different port or cable"}],
    terminal:[{label:"List USB controllers and devices",cmd:"Get-WmiObject Win32_USBController | Select Name,Status | Format-Table\nGet-PnpDevice -Class USB | Where-Object {$_.Status -eq 'OK'} | Select FriendlyName | Format-Table",desc:"Shows all USB controllers and connected devices."},{label:"Disable USB power management",cmd:"Get-WmiObject MSPower_DeviceEnable -Namespace root\\wmi | Where-Object {$_.InstanceName -match 'USB'} | ForEach-Object { $_.Enable = $false; $_.Put() }",desc:"Prevents Windows from cutting USB power. Fixes random disconnects."}],
    bios:[{path:"Advanced → USB → USB Legacy Support",desc:"Enable for USB keyboards/mice to work before OS loads (e.g. in BIOS).",note:"Required for bootable USB diagnostics"},{path:"Advanced → USB → USB 3.x Controller",desc:"If USB 3 ports not detected — verify controller is ENABLED.",note:"Can be disabled in BIOS"}]},
  pcie:{desc:"PCIe device on the motherboard expansion bus. Each device has a vendor ID (VEN) and device ID (DEV) for driver identification.",
    faults:[{s:"h",t:"PCIe device with error code — check Device Manager for specific code"},{s:"m",t:"Device not detected — verify PCIe slot not disabled in BIOS"},{s:"l",t:"Unknown device — search Hardware ID on deviceinfo.me"}],
    terminal:[{label:"List all PCIe devices",cmd:"Get-PnpDevice | Where-Object {$_.InstanceId -match '^PCI\\\\'} | Select FriendlyName,Status,Class | Format-Table",desc:"Lists every PCIe device and its status. Filter non-OK for problems."},{label:"Find driver for unknown device",cmd:"Get-PnpDevice | Where-Object {$_.Status -ne 'OK'} | ForEach-Object { Write-Host $_.FriendlyName; Write-Host $_.InstanceId }",desc:"Shows Hardware IDs. Search on deviceinfo.me to find the correct driver."}],
    bios:[{path:"Advanced → PCIe Configuration",desc:"Check if any PCIe slots are disabled. Some boards allow disabling individual slots.",note:"Start here for any missing PCIe device"},{path:"Advanced → PCIe → Speed (Gen)",desc:"Try Gen 3 instead of Auto if device is unstable.",note:"Compatibility fix for older cards"}]},
  unknown:{desc:"Problem device — Windows cannot load a driver or the device reports a hardware error. Check Device Manager for the specific error code.",
    faults:[{s:"h",t:"Code 43 — device self-reported hardware failure, may need replacement"},{s:"h",t:"Code 28 — driver not installed. Find correct driver via Hardware ID"},{s:"m",t:"Code 10 — device failed to start. Try different driver version"}],
    terminal:[{label:"All problem devices with IDs",cmd:"Get-PnpDevice | Where-Object {$_.Status -ne 'OK'} | ForEach-Object { Write-Host \"$($_.FriendlyName)\"; Write-Host \"$($_.InstanceId)\"; Write-Host '---' }",desc:"Hardware IDs for driver lookup at deviceinfo.me or driveridentifier.com"},{label:"Force hardware rescan",cmd:"pnputil /scan-devices",desc:"Forces Windows to re-detect all hardware. Fixes some missing devices without reboot."}],
    bios:[{path:"Advanced → PCIe/Device Configuration",desc:"Check if any devices are accidentally disabled.",note:"First step for any missing device"}]}
};

// ═══ RICH DEMO DATA — EliteDesk 800 G3 ═══
const DEMO={
  platine_version:"1.0.0",scan_id:"A3F2B891",scan_date:"2025-03-11 14:32:07",
  machine:{manufacturer:"HP",model:"EliteDesk 800 G3 SFF",model_id:"HP_EliteDesk_800_G3_SFF",board_product:"8265",chassis_type:"Desktop",bios_vendor:"HP",bios_version:"P01 Ver. 02.40",bios_date:"2022-08-15"},
  cpu:[{name:"Intel Core i7-7700 @ 3.60GHz",manufacturer:"Intel",socket:"LGA1151",cores:4,logical_processors:8,base_clock_mhz:3600,current_clock_mhz:3600,l3_cache_kb:8192,temp_celsius:61,load_percent:34,virtualization:true,stepping:"9"}],
  memory:{total_gb:16,total_slots:4,used_slots:2,max_capacity_gb:64,
    modules:[
      {slot:"DIMM1",size_gb:8,type:"DDR4",form_factor:"DIMM",speed_mhz:2400,configured_mhz:2133,manufacturer:"Micron",part_number:"16ATF1G64AZ",voltage_default:"1.20V"},
      {slot:"DIMM3",size_gb:8,type:"DDR4",form_factor:"DIMM",speed_mhz:2400,configured_mhz:2133,manufacturer:"Samsung",part_number:"M378A1G43DB0",voltage_default:"1.20V"}
    ]},
  storage:{drives:[
    {index:0,model:"Samsung SSD 860 EVO 500GB",serial:"S3YFNX0K123",bus_type:"SATA",size_gb:465.8,smart_status:"OK",smart_failing:false,smart_attributes:[{id:5,name:"Reallocated Sectors",raw:0},{id:9,name:"Power On Hours",raw:8742},{id:177,name:"Wear Leveling",raw:22},{id:194,name:"Temperature",raw:31}]},
    {index:1,model:"WDC WD10EZEX-08WN4A0",serial:"WD-WCC6Y7",bus_type:"SATA",size_gb:931.5,smart_status:"WARNING",smart_failing:false,smart_attributes:[{id:5,name:"Reallocated Sectors",raw:104},{id:9,name:"Power On Hours",raw:29841},{id:197,name:"Pending Sectors",raw:18},{id:194,name:"Temperature",raw:37}]}
  ]},
  gpu:[
    {name:"Intel HD Graphics 630",is_integrated:true,vram_mb:128,vram_display:"128MB shared",resolution_h:1920,resolution_v:1080,refresh_rate:60,driver_version:"27.20.100.9466",status:"OK"},
    {name:"NVIDIA GeForce GTX 1060 6GB",is_integrated:false,vram_mb:6144,vram_display:"6GB GDDR5",resolution_h:1920,resolution_v:1080,refresh_rate:60,driver_version:"537.13",status:"OK"}
  ],
  battery:[],
  network:[
    {name:"Intel I219-LM Gigabit",is_wireless:false,is_bluetooth:false,speed_mbps:1000,net_enabled:true,mac_address:"A4:BB:6D:11:22:33",ip_addresses:["192.168.1.42"]},
    {name:"Intel Wireless-AC 8265",is_wireless:true,is_bluetooth:false,speed_mbps:867,net_enabled:true,mac_address:"8C:8D:28:44:55:66"}
  ],
  audio:[
    {name:"Realtek ALC221 HD Audio",status:"OK",manufacturer:"Realtek"},
    {name:"Intel Display Audio",status:"OK",manufacturer:"Intel"}
  ],
  usb:{controllers:[
    {name:"Intel USB 3.0 xHCI Controller",status:"OK",pnp_id:"PCI\\VEN_8086&DEV_A2AF"},
    {name:"Intel USB 2.0 EHCI Controller #1",status:"OK",pnp_id:"PCI\\VEN_8086&DEV_A2AD"}
  ],connected_count:6,connected:[
    {name:"USB Root Hub (USB 3.0)"},
    {name:"Logitech USB Receiver"},
    {name:"USB Keyboard"},
    {name:"USB Mass Storage Device"}
  ]},
  pci_devices:[
    {name:"Intel 200 Series PCH LPC Controller",status:"OK",class:"System"},
    {name:"Intel 200 Series PCH SMBus",status:"OK",class:"System"},
    {name:"Intel Management Engine Interface",status:"OK",class:"System"},
    {name:"High Definition Audio Controller",status:"OK",class:"Media"},
    {name:"Intel Serial IO GPIO Controller",status:"OK",class:"System"}
  ],
  problem_devices:[
    {name:"PCI Device",instance_id:"PCI\\VEN_8086&DEV_A2A1",status:"Error",problem_code:28}
  ],
  event_log:{bsod:[],disk_errors:[],critical:[],summary:"0 critical events in last 7 days"},
  drivers:{total:142,unsigned:[],error_devices:[{device:"PCI Device",status:"Error",driver:""}],old_drivers:[]},
  diagnostic_summary:{health_score:62,health_label:"FAIR",
    issues:["HDD WDC: 104 reallocated sectors + 18 pending sectors — data loss risk"],
    warnings:["RAM running at 2133MHz (rated 2400MHz) — XMP not enabled","1 device missing driver (Code 28 — driver not installed)"]},
  performance:{cpu_load_pct:34,ram_used_gb:9.2,ram_total_gb:16,ram_used_pct:57,
    volumes:[{drive:"C:",total_gb:460,free_gb:187,used_pct:59},{drive:"D:",total_gb:930,free_gb:412,used_pct:56}]}
};

let scanData=null,selId=null,curTab='info',mapComps=[];

function handleFile(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{try{loadScan(JSON.parse(e.target.result))}catch{alert('Invalid JSON. Upload a file from platine-scan.ps1')}};
  r.readAsText(f);
}
function loadDemo(){loadScan(DEMO)}
function resetScan(){
  scanData=null;selId=null;mapComps=[];
  document.getElementById('upload-screen').style.display='flex';
  document.getElementById('map-screen').style.display='none';
  document.getElementById('hstrip').style.display='none';
  document.getElementById('hdr-model').textContent='v5 · Full Hardware Map';
  ['hl-cpu','hl-disk','hl-bat'].forEach(id=>document.getElementById(id).style.display='none');
  resetPanel();
}

function loadScan(data){
  scanData=data;
  const m=data.machine,s=data.diagnostic_summary||{};
  const isD=m.chassis_type&&!m.chassis_type.match(/Laptop|Notebook|Portable|Sub/i);
  document.getElementById('hdr-model').textContent=m.manufacturer+' '+m.model;
  document.getElementById('upload-screen').style.display='none';
  document.getElementById('map-screen').style.display='block';
  document.getElementById('map-model').textContent=m.manufacturer+' '+m.model;
  const tt=document.getElementById('map-tag');
  tt.textContent=isD?'Desktop':'Laptop';tt.className='mtag '+(isD?'desktop':'laptop');
  const hs=s.health_score||0,hl=hs>=80?'ok':hs>=60?'wn':'er';
  const hp=document.getElementById('hpill');hp.className='hpill '+hl;hp.textContent=hs+'/100 · '+(s.health_label||'?');
  document.getElementById('hstrip').style.display='grid';
  document.getElementById('hs-sc').textContent=hs+'/100';document.getElementById('hs-sc').className='hsv '+hl;
  document.getElementById('hs-lb').textContent=s.health_label||'—';
  document.getElementById('hs-is').textContent=(s.issues||[]).length;
  document.getElementById('hs-wn').textContent=(s.warnings||[]).length+' warnings';
  document.getElementById('hs-id').textContent='#'+(data.scan_id||'—');
  document.getElementById('hs-dt').textContent=(data.scan_date||'').substring(0,10);
  const all=[...(s.issues||[]),...(s.warnings||[])];
  if(all.length){document.getElementById('probanner').classList.add('show');document.getElementById('problist').innerHTML=all.map(p=>`<div class="pb-i">${p}</div>`).join('')}

  // Count all components including USB, PCIe etc
  let tc=0;
  if(data.cpu)tc+=data.cpu.length;
  if(data.memory?.modules)tc+=data.memory.modules.length;
  if(data.storage?.drives)tc+=data.storage.drives.length;
  if(data.gpu)tc+=data.gpu.length;
  if(data.battery?.length)tc+=data.battery.length;
  if(data.network)tc+=data.network.length;
  if(data.audio)tc+=data.audio.length;
  if(data.usb?.controllers)tc+=data.usb.controllers.length;
  if(data.pci_devices)tc+=data.pci_devices.length;
  if(data.problem_devices)tc+=data.problem_devices.length;
  document.getElementById('hs-co').textContent=tc;

  if(data.cpu?.[0]?.temp_celsius){
    const t=data.cpu[0].temp_celsius,el=document.getElementById('hl-cpu');
    el.style.display='flex';el.className='hlive '+(t>90?'er':t>75?'wn':'');
    document.getElementById('hlv-cpu').textContent=t+'°C';
  }
  const badD=(data.storage?.drives||[]).find(d=>d.smart_failing||d.smart_status==='WARNING');
  if(badD){document.getElementById('hl-disk').style.display='flex';document.getElementById('hl-disk').className='hlive er';document.getElementById('hlv-disk').textContent='⚠ SMART';}
  const bat=(data.battery||[])[0];
  if(bat?.health_pct){const el=document.getElementById('hl-bat');el.style.display='flex';el.className='hlive '+(bat.health_pct<50?'er':bat.health_pct<75?'wn':'');document.getElementById('hlv-bat').textContent=bat.health_pct+'%';}

  buildMap(data,isD);resetPanel();
  renderSymptoms(data);
  renderComparison(data);
}

function renderComparison(data){
  const ecmp=document.getElementById('ecmp');
  const dcmp=document.getElementById('dcmp');
  const tabEl=document.getElementById('tab-comparison');
  if(!ecmp||!dcmp) return;

  // Build comparison checks
  const checks=[];

  // ── CPU ──────────────────────────────────────────────────
  const cpu=(data.cpu||[])[0];
  if(cpu){
    const t=cpu.temp_celsius;
    if(t!=null){
      const sc=t>90?'er':t>75?'wn':'ok';
      const exp=t>90?'<75°C (critical — throttling likely)':t>75?'<75°C (elevated)':'<75°C';
      checks.push({group:'CPU',sc,label:'Temperature',real:`${t}°C`,expected:exp,
        action:t>90?'<strong>Immediately</strong> clean heatsink + replace thermal paste':
               t>75?'Clean heatsink fins with compressed air':'Within normal range'});
    }
    if(cpu.throttling===true||cpu.freq_ratio<80){
      const r=cpu.freq_ratio||'?';
      checks.push({group:'CPU',sc:'wn',label:'Throttling detected',real:`Running at ${r}% max speed`,expected:'100% of rated frequency',
        action:'Check temperatures → clean cooling → verify AC adapter wattage'});
    }
  }

  // ── RAM ──────────────────────────────────────────────────
  const mem=data.memory||{};
  const mods=mem.modules||[];
  const totalSlots=mem.total_slots||0;
  const usedSlots=mods.length;
  if(totalSlots>=2 && usedSlots===1){
    checks.push({group:'RAM',sc:'wn',label:'Single channel — slot empty',real:'1 module installed',expected:`${totalSlots} slots populated (dual channel)`,
      action:'Add matching RAM stick for dual-channel — +35% memory bandwidth'});
  }
  mods.forEach(m=>{
    if(m.speed_mhz && m.configured_mhz && m.configured_mhz < m.speed_mhz){
      checks.push({group:'RAM',sc:'wn',label:`${m.slot} — running below rated speed`,real:`${m.configured_mhz} MHz`,expected:`${m.speed_mhz} MHz (rated)`,
        action:'Enable XMP (Intel) or DOCP (AMD) in BIOS → Advanced → Memory'});
    }
  });

  // ── STORAGE ──────────────────────────────────────────────
  (data.storage?.drives||[]).forEach(d=>{
    if(d.smart_failing){
      checks.push({group:'Storage',sc:'er',label:`${d.model} — SMART failing`,real:'Drive failure imminent',expected:'SMART: PASSED (0 bad sectors)',
        action:'<strong>Back up all data immediately.</strong> Replace drive before next boot if possible'});
    } else if(d.smart_status==='WARNING'){
      checks.push({group:'Storage',sc:'wn',label:`${d.model} — SMART warning`,real:'SMART: WARNING',expected:'SMART: PASSED',
        action:'Run extended SMART test: smartctl -t long /dev/sdX — monitor closely'});
    }
    const reallocated=(d.smart_attributes||[]).find(a=>a.id===5);
    if(reallocated&&reallocated.raw>0){
      const sc=reallocated.raw>10?'er':'wn';
      checks.push({group:'Storage',sc,label:`${d.model} — reallocated sectors`,real:`${reallocated.raw} sectors`,expected:'0 sectors',
        action:reallocated.raw>10?'<strong>Replace drive soon</strong> — data loss risk':'Monitor — reallocation count growing means drive is degrading'});
    }
    const pending=(d.smart_attributes||[]).find(a=>a.id===197);
    if(pending&&pending.raw>0){
      checks.push({group:'Storage',sc:'wn',label:`${d.model} — pending sectors`,real:`${pending.raw} pending`,expected:'0 pending sectors',
        action:'Sectors waiting to be reallocated — run full disk scan (chkdsk /r or badblocks)'});
    }
  });

  // ── BATTERY ──────────────────────────────────────────────
  const bat=(data.battery||[])[0];
  if(bat&&bat.health_pct!=null){
    const h=bat.health_pct;
    const sc=h<50?'er':h<75?'wn':'ok';
    if(sc!=='ok'){
      checks.push({group:'Battery',sc,label:'Battery health degraded',real:`${h}% of original capacity`,expected:'>80% health',
        action:h<50?'<strong>Replace battery</strong> — risk of sudden shutdown / swelling':
               'Plan replacement — avoid full discharge cycles until replaced'});
    }
    if(bat.cycle_count>500){
      checks.push({group:'Battery',sc:'wn',label:'High cycle count',real:`${bat.cycle_count} cycles`,expected:'<500 cycles (typical lifespan)',
        action:'Normal wear — consider replacement soon, especially if health is declining'});
    }
  }

  // ── THERMALS ─────────────────────────────────────────────
  const thermals=data.thermals?.sensors||[];
  thermals.forEach(s=>{
    if(s.temp_celsius>85&&s.label&&!s.label.toLowerCase().includes('cpu')){
      checks.push({group:'Thermals',sc:s.temp_celsius>95?'er':'wn',
        label:`${s.label} — high temperature`,real:`${s.temp_celsius}°C`,expected:'<80°C',
        action:`High temp on ${s.label} — check airflow and thermal solution`});
    }
  });

  // ── PROBLEM DEVICES ──────────────────────────────────────
  (data.problem_devices||[]).slice(0,3).forEach(p=>{
    checks.push({group:'Devices',sc:'er',label:p.name||'Unknown device',real:p.error||'Driver/firmware error',expected:'Device working correctly',
      action:'Update or reinstall drivers — check dmesg for details'});
  });

  // ── Build badge ───────────────────────────────────────────
  const issues=checks.filter(c=>c.sc==='er').length;
  const warns=checks.filter(c=>c.sc==='wn').length;
  const existing=document.querySelector('.tab-cmp .cmp-badge');
  if(existing) existing.remove();
  if((issues+warns)>0 && tabEl){
    const badge=document.createElement('span');
    badge.className='sym-badge cmp-badge';
    badge.style.background=issues>0?'#b91c1c':'#b45309';
    badge.textContent=issues+warns;
    tabEl.appendChild(badge);
  }

  // ── Render ────────────────────────────────────────────────
  if(checks.length===0){
    ecmp.style.display='block'; dcmp.style.display='none';
    ecmp.innerHTML=`<div class="cmp-empty">
      <div class="ei">✓</div>
      <div class="cmp-empty-t">All values within expected range</div>
      <div class="cmp-empty-s">No anomalies detected across CPU, RAM, storage, battery and thermals.</div>
    </div>`;
    return;
  }

  ecmp.style.display='none'; dcmp.style.display='block';

  // Group by hardware section
  const groups={};
  checks.forEach(c=>{
    if(!groups[c.group]) groups[c.group]=[];
    groups[c.group].push(c);
  });

  // Sort groups: errors first
  const order=['Storage','CPU','RAM','Battery','Thermals','Devices'];
  const sortedGroups=order.filter(g=>groups[g]).concat(Object.keys(groups).filter(g=>!order.includes(g)));

  // Summary line
  const summaryClass=issues>0?'er':warns>0?'wn':'ok';
  let html=`<div style="padding:8px 0 10px;border-bottom:1px solid var(--bd);margin-bottom:6px">
    <div style="font-size:11px;font-weight:700;color:var(--${summaryClass==='er'?'er':summaryClass==='wn'?'wn':'ok'})">
      ${issues>0?`⚠ ${issues} critical issue${issues>1?'s':''}`:''} 
      ${warns>0?`${issues>0?'· ':''}${warns} warning${warns>1?'s':''}`:''}
      ${issues===0&&warns===0?'✓ All clear':''}
    </div>
    <div style="font-size:10px;color:var(--tx3);margin-top:2px">Real vs expected values</div>
  </div>`;

  sortedGroups.forEach(group=>{
    const rows=groups[group];
    html+=`<div class="cmp-section">
      <div class="cmp-title">${group}</div>`;
    rows.forEach(c=>{
      html+=`<div class="cmp-row">
        <div class="cmp-dot ${c.sc}"></div>
        <div class="cmp-body">
          <div class="cmp-label">${c.label}</div>
          <div class="cmp-vals">
            <span class="cmp-real ${c.sc}">${c.real}</span>
            <span class="cmp-arrow">→</span>
            <span class="cmp-expected">expected: ${c.expected}</span>
          </div>
          <div class="cmp-action">${c.action}</div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  });

  dcmp.innerHTML=html;
}

function renderSymptoms(data){
  const symptoms=(data.diagnostic_summary?.symptoms)||data.symptoms||[];
  const esym=document.getElementById('esym');
  const dsym=document.getElementById('dsym');
  const tabEl=document.getElementById('tab-symptoms');
  if(!esym||!dsym) return;

  // Badge on tab
  const existing=document.querySelector('.tab-sym .sym-badge');
  if(existing) existing.remove();
  if(symptoms.length>0 && tabEl){
    const badge=document.createElement('span');
    badge.className='sym-badge';
    badge.textContent=symptoms.length;
    tabEl.appendChild(badge);
  }

  if(symptoms.length===0){
    // All clear
    esym.style.display='block'; dsym.style.display='none';
    esym.innerHTML=`<div class="sym-empty-ok">
      <div class="sym-big">✓</div>
      <div class="sym-ok-t">No symptoms detected</div>
      <div class="sym-ok-s">All hardware parameters within normal range.</div>
    </div>`;
    return;
  }

  esym.style.display='none'; dsym.style.display='block';

  const sevClass=s=>s==='critical'?'er':s==='warning'?'wn':'ok';
  const sevLabel=s=>s==='critical'?'CRITICAL':s==='warning'?'WARNING':'INFO';

  dsym.innerHTML=symptoms.map(sym=>{
    const sc=sevClass(sym.severity||'warning');
    const causes=(sym.likely_causes||[]).map(c=>`<li>${c}</li>`).join('');
    const actions=(sym.immediate_actions||[]).map(a=>`<li>${a}</li>`).join('');
    const steps=(sym.diagnostic_steps||[]).map(s=>`<li>${s}</li>`).join('');
    return `<div class="sym-card ${sc}">
      <div class="sym-hdr">
        <div class="sym-dot ${sc}"></div>
        <div class="sym-title">${sym.symptom||'Unknown symptom'}</div>
        <span class="sym-sev ${sc}">${sevLabel(sym.severity)}</span>
      </div>
      <div class="sym-hw">📍 ${sym.hardware_component||'Unknown'} · detected by ${sym.detected_by||'scanner'}</div>
      ${causes?`<div class="sym-section">Likely causes</div><ul class="sym-list">${causes}</ul>`:''}
      ${actions?`<div class="sym-section">Immediate actions</div><ul class="sym-list">${actions}</ul>`:''}
      ${steps?`<div class="sym-section">Diagnostic steps</div><ul class="sym-list">${steps}</ul>`:''}
    </div>`;
  }).join('');
}

function stC(s){return s==='er'?'#b91c1c':s==='wn'?'#b45309':'#16a34a'}
function stF(s){return s==='er'?'#fef2f2':s==='wn'?'#fffbeb':'#f0fdf4'}
function stB(s){return s==='er'?'#fecaca':s==='wn'?'#fde68a':'#bbf7d0'}

function buildMap(data,isD){
  mapComps=[];
  const push=(obj)=>mapComps.push(obj);

  // ── CPU ──
  if(data.cpu)data.cpu.forEach((c,i)=>{
    const t=c.temp_celsius;
    push({id:'cpu_'+i,type:'cpu',name:'CPU',ref:c.name,data:c,status:t>90?'er':t>75?'wn':'ok',z:isD?{x:190,y:60,w:140,h:120}:{x:210,y:55,w:130,h:110}});
  });

  // ── RAM ──
  if(data.memory?.modules){
    data.memory.modules.forEach((m,i)=>push({id:'ram_'+i,type:'ram',name:m.slot,ref:m.size_gb+'GB '+m.type,data:m,status:'ok',z:isD?{x:18+i*44,y:60,w:38,h:170}:{x:14+i*48,y:40,w:42,h:120}}));
    const used=data.memory.modules.length,tot=data.memory.total_slots||4;
    for(let i=used;i<Math.min(tot,4);i++)push({id:'rame'+i,type:'ram_empty',name:'DIMM '+(i+1),ref:'Empty',data:{},status:'ok',z:isD?{x:18+i*44,y:60,w:38,h:170}:{x:14+i*48,y:40,w:42,h:120}});
  }

  // ── STORAGE ──
  if(data.storage?.drives)data.storage.drives.forEach((d,i)=>{
    const st=d.smart_failing?'er':d.smart_status==='WARNING'?'wn':'ok';
    push({id:'disk_'+i,type:'storage',name:d.bus_type==='NVMe'?'NVMe':d.model.match(/SSD/i)?'SSD':'HDD',ref:d.model+' '+d.size_gb+'GB',data:d,status:st,z:isD?{x:18+i*170,y:420,w:158,h:50}:{x:14+i*148,y:295,w:136,h:48}});
  });

  // ── GPU ──
  if(data.gpu)data.gpu.forEach((g,i)=>{
    if(!g.is_integrated)push({id:'gpu_'+i,type:'gpu',name:'GPU',ref:g.name,data:g,status:'ok',z:isD?{x:340,y:210,w:210,h:58}:{x:210,y:170,w:160,h:54}});
    else push({id:'igpu_'+i,type:'igpu',name:'iGPU',ref:g.name,data:g,status:'ok',z:isD?{x:340,y:60,w:110,h:55}:{x:350,y:55,w:110,h:55}});
  });

  // ── BATTERY ──
  if(data.battery?.length){const b=data.battery[0];push({id:'bat0',type:'battery',name:'Battery',ref:b.chemistry||'Li-Ion',data:b,status:b.health_pct<50?'er':b.health_pct<75?'wn':'ok',z:{x:14,y:365,w:130,h:32}});}

  // ── PSU (desktop) ──
  if(isD)push({id:'psu0',type:'psu',name:'PSU',ref:'ATX Power Supply',data:{},status:'ok',z:{x:560,y:370,w:230,h:110}});

  // ── NETWORK ──
  if(data.network){
    data.network.filter(n=>!n.is_wireless&&!n.is_bluetooth).forEach((n,i)=>push({id:'lan'+i,type:'network',name:'LAN',ref:n.name,data:n,status:n.net_enabled?'ok':'wn',z:isD?{x:560,y:60+i*54,w:130,h:44}:{x:525,y:40+i*50,w:120,h:42}}));
    data.network.filter(n=>n.is_wireless).forEach((n,i)=>push({id:'wifi'+i,type:'network',name:'WiFi',ref:n.name,data:n,status:n.net_enabled?'ok':'wn',z:isD?{x:560,y:130+i*54,w:130,h:44}:{x:525,y:100+i*50,w:120,h:42}}));
  }

  // ── AUDIO ── (ALL codecs, not just one)
  if(data.audio)data.audio.forEach((a,i)=>push({id:'audio'+i,type:'audio',name:'Audio',ref:a.name,data:a,status:a.status==='OK'?'ok':'wn',z:isD?{x:560,y:210+i*54,w:130,h:44}:{x:525,y:180+i*50,w:120,h:42}}));

  // ── USB CONTROLLERS ── (NEW in v5)
  if(data.usb?.controllers)data.usb.controllers.forEach((u,i)=>push({id:'usb'+i,type:'usb',name:'USB',ref:u.name,data:u,status:u.status==='OK'?'ok':'er',z:isD?{x:560,y:280+i*54,w:130,h:44}:{x:525,y:240+i*50,w:120,h:42}}));

  // ── PCIe DEVICES ── (NEW in v5 — shown as small chips)
  if(data.pci_devices){
    const W=isD?810:700;
    data.pci_devices.slice(0,8).forEach((p,i)=>push({id:'pci'+i,type:'pcie',name:'PCIe',ref:p.name,data:p,status:p.status==='OK'?'ok':'er',z:isD?{x:190+i*74,y:490,w:68,h:30}:{x:14+i*80,y:360,w:72,h:28}}));
  }

  // ── PROBLEM DEVICES ── (with error state)
  if(data.problem_devices)data.problem_devices.forEach((p,i)=>push({id:'prob'+i,type:'unknown',name:'⚠ Unknown',ref:p.name||'Problem device',data:p,status:'er',z:isD?{x:560,y:330+i*34,w:130,h:30}:{x:525,y:290+i*34,w:120,h:28}}));

  renderSVG(isD);
}

function renderSVG(isD){
  const W=isD?810:700,H=isD?545:485;
  const svg=document.getElementById('bsvg');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);

  let h='';
  // PCB background — white with subtle texture
  h+=`<rect width="${W}" height="${H}" rx="10" fill="#fafaf9"/>`;
  h+=`<g stroke="#e2e2de" stroke-width=".5" opacity=".6">`;
  for(let x=20;x<W;x+=20)h+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for(let y=20;y<H;y+=20)h+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  h+='</g>';

  // Zone backgrounds
  const zones=isD?[
    {l:'CPU / SoC',x:175,y:43,w:295,h:215,c:'rgba(22,163,74,.05)',b:'#bbf7d0',t:'#16a34a'},
    {l:'Memory',x:8,y:43,w:168,h:365,c:'rgba(180,83,9,.05)',b:'#fde68a',t:'#b45309'},
    {l:'Storage',x:8,y:403,w:550,h:68,c:'rgba(168,85,247,.05)',b:'#e9d5ff',t:'#9333ea'},
    {l:'PCIe Devices',x:175,y:473,w:555,h:52,c:'rgba(14,165,233,.05)',b:'#bae6fd',t:'#0284c7'},
    {l:'I/O',x:545,y:43,w:258,h:320,c:'rgba(22,163,74,.04)',b:'#bbf7d0',t:'#16a34a'},
    {l:'Power',x:545,y:355,w:258,h:140,c:'rgba(185,28,28,.05)',b:'#fecaca',t:'#b91c1c'}
  ]:[
    {l:'Memory / Storage',x:8,y:28,w:200,h:310,c:'rgba(180,83,9,.05)',b:'#fde68a',t:'#b45309'},
    {l:'CPU / SoC',x:214,y:28,w:300,h:260,c:'rgba(22,163,74,.05)',b:'#bbf7d0',t:'#16a34a'},
    {l:'I/O',x:520,y:28,w:170,h:305,c:'rgba(22,163,74,.04)',b:'#bbf7d0',t:'#16a34a'},
    {l:'PCIe',x:8,y:345,w:685,h:48,c:'rgba(14,165,233,.05)',b:'#bae6fd',t:'#0284c7'},
    {l:'Power',x:8,y:300,w:200,h:38,c:'rgba(185,28,28,.05)',b:'#fecaca',t:'#b91c1c'}
  ];

  zones.forEach(z=>{
    h+=`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" fill="${z.c}" stroke="${z.b}" stroke-width="1" stroke-dasharray="5 3"/>`;
    h+=`<text x="${z.x+7}" y="${z.y+12}" font-family="DM Mono,monospace" font-size="7" fill="${z.t}" font-weight="500" letter-spacing="1.5" opacity=".8">${z.l.toUpperCase()}</text>`;
  });

  // Mounting holes
  [[10,10],[W-10,10],[10,H-10],[W-10,H-10]].forEach(([x,y])=>{
    h+=`<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#d0d0cb" stroke-width="1"/>`;
    h+=`<circle cx="${x}" cy="${y}" r="1.5" fill="#d0d0cb"/>`;
  });

  // Render each component
  mapComps.forEach(c=>{
    const {x,y,w,h:ch}=c.z,color=stC(c.status),fill=stF(c.status),border=stB(c.status);
    const isE=c.type==='ram_empty';
    h+=`<g class="cg ${c.status}" id="cg-${c.id}" onclick="selComp('${c.id}')">`;

    if(c.type==='ram'||c.type==='ram_empty'){
      // RAM DIMM
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="2" fill="${isE?'#f7f7f5':'white'}" stroke="${isE?'#e2e2de':border}" stroke-width="${isE?.8:1.5}"/>`;
      if(!isE){
        for(let py=y+8;py<y+ch-8;py+=10){
          h+=`<rect x="${x+1}" y="${py}" width="3" height="6" rx=".5" fill="${border}"/>`;
          h+=`<rect x="${x+w-4}" y="${py}" width="3" height="6" rx=".5" fill="${border}"/>`;
        }
        const mx=x+w/2,my=y+ch/2;
        h+=`<text x="${mx}" y="${my}" font-family="DM Mono,monospace" font-size="6" fill="${color}" text-anchor="middle" font-weight="500" transform="rotate(-90,${mx},${my})" dy="-${w/2-10}">${c.data.size_gb}GB</text>`;
        h+=`<text x="${mx}" y="${my+10}" font-family="DM Mono,monospace" font-size="5" fill="#8a8a85" text-anchor="middle" transform="rotate(-90,${mx},${my+10})" dy="-${w/2-10}">${c.data.type||''}</text>`;
      }else{
        const mx=x+w/2,my=y+ch/2;
        h+=`<text x="${mx}" y="${my}" font-family="DM Mono,monospace" font-size="5.5" fill="#d0d0cb" text-anchor="middle" transform="rotate(-90,${mx},${my})">EMPTY</text>`;
      }
    }else if(c.type==='cpu'||c.type==='igpu'){
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="4" fill="white" stroke="${border}" stroke-width="1.5"/>`;
      // BGA dots
      for(let bx=x+10;bx<x+w-8;bx+=10)for(let by=y+10;by<y+ch-8;by+=10)h+=`<circle cx="${bx}" cy="${by}" r=".8" fill="#e2e2de"/>`;
      h+=`<rect x="${x+w*.15}" y="${y+ch*.18}" width="${w*.7}" height="${ch*.64}" rx="2" fill="${fill}" stroke="${border}" stroke-width="1"/>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2-8}" font-family="DM Sans,sans-serif" font-size="7" fill="${color}" text-anchor="middle" font-weight="700">${c.name}</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+3}" font-family="DM Mono,monospace" font-size="6" fill="#4a4a47" text-anchor="middle">${(c.ref||'').split('@')[0].replace('Intel Core ','').replace('AMD Ryzen ','').trim().substring(0,14)}</text>`;
      if(c.data.temp_celsius)h+=`<text x="${x+w/2}" y="${y+ch/2+15}" font-family="DM Mono,monospace" font-size="7" fill="${color}" text-anchor="middle" font-weight="500">${c.data.temp_celsius}°C</text>`;
    }else if(c.type==='gpu'){
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="3" fill="white" stroke="${border}" stroke-width="1.5"/>`;
      h+=`<rect x="${x+3}" y="${y+3}" width="${w-6}" height="${ch-6}" rx="2" fill="${fill}"/>`;
      for(let tx=x+8;tx<x+w-4;tx+=8)h+=`<rect x="${tx}" y="${y+ch-2}" width="4" height="6" rx=".5" fill="#d0d0cb"/>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2-4}" font-family="DM Sans,sans-serif" font-size="7" fill="#111" text-anchor="middle" font-weight="700">GPU</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+7}" font-family="DM Mono,monospace" font-size="6" fill="${color}" text-anchor="middle">${(c.ref||'').replace('NVIDIA GeForce ','').replace('AMD Radeon ','').substring(0,18)}</text>`;
    }else if(c.type==='pci_devices'||c.type==='pcie'){
      // Small PCIe chip
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="2" fill="${fill}" stroke="${border}" stroke-width="1"/>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2-3}" font-family="DM Mono,monospace" font-size="6" fill="${color}" text-anchor="middle" font-weight="500">PCIe</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+5}" font-family="DM Mono,monospace" font-size="4.5" fill="#8a8a85" text-anchor="middle">${(c.ref||'').replace('Intel ','').substring(0,14)}</text>`;
    }else if(c.type==='psu'){
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="4" fill="white" stroke="#fecaca" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2-6}" font-family="DM Sans,sans-serif" font-size="9" fill="#b91c1c" text-anchor="middle" font-weight="700" opacity=".7">PSU</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+7}" font-family="DM Mono,monospace" font-size="6" fill="#8a8a85" text-anchor="middle">ATX Power Supply</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+18}" font-family="DM Mono,monospace" font-size="5.5" fill="#d0d0cb" text-anchor="middle">24-pin + 8-pin EPS</text>`;
    }else if(c.type==='storage'){
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="3" fill="white" stroke="${border}" stroke-width="1.5"/>`;
      h+=`<rect x="${x+3}" y="${y+3}" width="${w-6}" height="${ch-6}" rx="2" fill="${fill}"/>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2-4}" font-family="DM Sans,sans-serif" font-size="7" fill="#111" text-anchor="middle" font-weight="700">${c.name}</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+6}" font-family="DM Mono,monospace" font-size="5.5" fill="${color}" text-anchor="middle">${(c.data.model||'').substring(0,22)} · ${c.data.smart_status||'?'}</text>`;
    }else{
      h+=`<rect class="cb" x="${x}" y="${y}" width="${w}" height="${ch}" rx="3" fill="${fill}" stroke="${border}" stroke-width="1"/>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2-3}" font-family="DM Mono,monospace" font-size="7" fill="${color}" text-anchor="middle" font-weight="500">${c.name}</text>`;
      h+=`<text x="${x+w/2}" y="${y+ch/2+7}" font-family="DM Mono,monospace" font-size="5.5" fill="#8a8a85" text-anchor="middle">${(c.ref||'').substring(0,22)}</text>`;
    }

    // Status dot
    h+=`<circle cx="${x+w-5}" cy="${y+5}" r="3.5" fill="${color}" opacity=".9"/>`;
    h+='</g>';
  });

  // Border
  h+=`<rect width="${W}" height="${H}" rx="10" fill="none" stroke="#d0d0cb" stroke-width="1.5"/>`;
  // Model label
  h+=`<text x="${W/2}" y="${H-4}" font-family="DM Mono,monospace" font-size="7" fill="#d0d0cb" text-anchor="middle">${scanData?.machine?.manufacturer||''} ${scanData?.machine?.model||''} · Platine v5 · platine.dev</text>`;

  svg.innerHTML=h;
}

function selComp(id){
  if(selId){const p=document.getElementById('cg-'+selId);if(p)p.classList.remove('sel')}
  selId=id;const el=document.getElementById('cg-'+id);if(el)el.classList.add('sel');
  const c=mapComps.find(x=>x.id===id);if(!c)return;
  renderPanel(c);
}

function renderPanel(c){
  const kk={'ram_empty':'ram','igpu':'gpu','pcie':'pcie'}[c.type]||c.type;
  const kb=KB[kk]||KB['unknown'];
  document.getElementById('ei').style.display='none';document.getElementById('di').style.display='block';
  const ab=document.getElementById('abox');ab.className='abox';
  if(c.status==='er'){ab.className='abox er';ab.textContent='⚠ '+(kb.faults?.[0]?.t||'Critical issue detected')}
  else if(c.status==='wn'){ab.className='abox wn';ab.textContent='⚠ '+(kb.faults?.[0]?.t||'Warning condition')}
  document.getElementById('dn').textContent=c.name;
  document.getElementById('dr').textContent=c.ref;
  const sp=document.getElementById('ds'),sl={ok:'OK — Nominal',wn:'Warning — Check Required',er:'⚠ Fault Detected'};
  sp.className='spill '+c.status;sp.innerHTML=`<div class="sdot"></div><span>${sl[c.status]}</span>`;
  document.getElementById('dd').textContent=kb.desc||'Component detected by Platine scanner.';
  document.getElementById('dsp').innerHTML=buildSpecs(c).map(s=>`<div class="sc2"><div class="sl">${s.l}</div><div class="sv ${s.c||''}">${s.v}</div></div>`).join('');
  document.getElementById('et2').style.display='none';document.getElementById('dt').style.display='block';
  document.getElementById('dt').innerHTML=(kb.terminal||[]).map(t=>`<div class="cmdblock"><div class="cmdhdr"><span class="cmdlbl">${t.label}</span><button class="copybtn" onclick="cpCmd(this,\`${t.cmd.replace(/`/g,'\\`')}\`)">Copy</button></div><div class="cmdcode">${t.cmd}</div><div class="cmddesc">${t.desc}</div></div>`).join('')||'<div style="font-size:10px;color:var(--tx3);padding:6px">No terminal commands for this component yet.</div>';
  document.getElementById('eb').style.display='none';document.getElementById('db').style.display='block';
  document.getElementById('db').innerHTML=(kb.bios||[]).map(b=>`<div class="biosblock"><div class="biospath">⚙ ${b.path}</div><div class="biosdesc">${b.desc}</div>${b.note?`<div class="biosnote">ℹ ${b.note}</div>`:''}</div>`).join('')||'<div style="font-size:10px;color:var(--tx3);padding:6px">No BIOS fixes for this component yet.</div>';
  document.getElementById('ef2').style.display='none';document.getElementById('df').style.display='block';
  document.getElementById('df').innerHTML=`<ul class="flist">${(kb.faults||[]).map(f=>`<li class="fitem"><div class="fdot ${f.s}"></div><span>${f.t}</span></li>`).join('')}</ul>`;
}

function buildSpecs(c){
  const d=c.data,sp=[];
  if(c.type==='cpu'){
    if(d.cores)sp.push({l:'Cores',v:`${d.cores}C / ${d.logical_processors}T`});
    if(d.base_clock_mhz)sp.push({l:'Base Clock',v:`${d.base_clock_mhz} MHz`});
    if(d.temp_celsius)sp.push({l:'Temperature',v:`${d.temp_celsius}°C`,c:d.temp_celsius>90?'er':d.temp_celsius>75?'wn':'ok'});
    if(d.load_percent!=null)sp.push({l:'CPU Load',v:`${d.load_percent}%`});
    if(d.l3_cache_kb)sp.push({l:'L3 Cache',v:`${d.l3_cache_kb/1024}MB`});
    if(d.socket)sp.push({l:'Socket',v:d.socket});
  }else if(c.type==='ram'){
    if(d.size_gb)sp.push({l:'Capacity',v:`${d.size_gb}GB`});
    if(d.type)sp.push({l:'Type',v:d.type});
    if(d.speed_mhz)sp.push({l:'Rated Speed',v:`${d.speed_mhz} MHz`});
    if(d.configured_mhz)sp.push({l:'Running At',v:`${d.configured_mhz} MHz`,c:d.configured_mhz<d.speed_mhz?'wn':''});
    if(d.manufacturer)sp.push({l:'Maker',v:d.manufacturer});
    if(d.voltage_default)sp.push({l:'Voltage',v:d.voltage_default});
  }else if(c.type==='storage'){
    if(d.size_gb)sp.push({l:'Capacity',v:`${d.size_gb}GB`});
    if(d.bus_type)sp.push({l:'Interface',v:d.bus_type});
    sp.push({l:'SMART',v:d.smart_status||'?',c:d.smart_failing?'er':d.smart_status==='WARNING'?'wn':'ok'});
    const r=(d.smart_attributes||[]).find(a=>a.id===5);if(r)sp.push({l:'Realloc Sectors',v:String(r.raw),c:r.raw>0?'wn':'ok'});
    const poh=(d.smart_attributes||[]).find(a=>a.id===9);if(poh)sp.push({l:'Power On Hours',v:String(poh.raw)});
    const dt=(d.smart_attributes||[]).find(a=>a.id===194||a.id===190);if(dt)sp.push({l:'Disk Temp',v:`${dt.raw}°C`});
  }else if(c.type==='gpu'||c.type==='igpu'){
    if(d.vram_display)sp.push({l:'VRAM',v:d.vram_display});
    sp.push({l:'Type',v:d.is_integrated?'Integrated':'Discrete'});
    if(d.resolution_h)sp.push({l:'Resolution',v:`${d.resolution_h}×${d.resolution_v}`});
    if(d.refresh_rate)sp.push({l:'Refresh',v:`${d.refresh_rate}Hz`});
    if(d.driver_version)sp.push({l:'Driver',v:d.driver_version.substring(0,14)});
  }else if(c.type==='battery'){
    if(d.charge_remaining)sp.push({l:'Charge',v:`${d.charge_remaining}%`});
    if(d.health_pct)sp.push({l:'Health',v:`${d.health_pct}%`,c:d.health_pct<50?'er':d.health_pct<75?'wn':'ok'});
    if(d.cycle_count)sp.push({l:'Cycles',v:String(d.cycle_count)});
    if(d.design_capacity_wh)sp.push({l:'Design',v:`${d.design_capacity_wh}Wh`});
  }else if(c.type==='network'){
    if(d.speed_mbps)sp.push({l:'Speed',v:`${d.speed_mbps} Mbps`});
    sp.push({l:'Status',v:d.net_enabled?'Active':'Inactive',c:d.net_enabled?'ok':'wn'});
    if(d.mac_address)sp.push({l:'MAC',v:d.mac_address});
    if(d.ip_addresses?.[0])sp.push({l:'IP',v:d.ip_addresses[0]});
  }else if(c.type==='usb'){
    sp.push({l:'Status',v:d.status||'OK',c:d.status==='OK'?'ok':'er'});
    if(d.pnp_id)sp.push({l:'Device ID',v:(d.pnp_id||'').substring(0,18)});
  }else if(c.type==='pcie'){
    sp.push({l:'Status',v:d.status||'OK',c:d.status==='OK'?'ok':'er'});
    if(d.class)sp.push({l:'Class',v:d.class});
  }else if(c.type==='unknown'){
    if(d.problem_code)sp.push({l:'Error Code',v:`Code ${d.problem_code}`,c:'er'});
    if(d.instance_id)sp.push({l:'Device ID',v:(d.instance_id||'').substring(0,18)});
  }
  return sp;
}

function resetPanel(){
  ['ei','et2','eb','ef2'].forEach(id=>document.getElementById(id).style.display='block');
  ['di','dt','db','df'].forEach(id=>document.getElementById(id).style.display='none');
  const tb=document.querySelector('.tab-sym .sym-badge');
  if(tb) tb.remove();
  const cb=document.querySelector('.tab-cmp .cmp-badge');
  if(cb) cb.remove();
}
function tab(t){
  curTab=t;
  const ns=['info','terminal','bios','faults','symptoms','comparison'];
  document.querySelectorAll('.tab').forEach((el,i)=>el.classList.toggle('active',ns[i]===t));
  document.querySelectorAll('.tab-pane').forEach((el,i)=>el.classList.toggle('active',ns[i]===t));
}
function cpCmd(btn,cmd){
  navigator.clipboard.writeText(cmd).then(()=>{btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',2000)}).catch(()=>{
    const ta=document.createElement('textarea');ta.value=cmd;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
    btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',2000);
  });
}
const dz=document.getElementById('dz');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{
  e.preventDefault();dz.classList.remove('drag');
  const f=e.dataTransfer.files[0];if(!f)return;
  const r=new FileReader();r.onload=ev=>{try{loadScan(JSON.parse(ev.target.result))}catch{alert('Invalid JSON')}};r.readAsText(f);
});

// ── WebSocket Live Connection ──────────────────────────────────────────────
let ws=null, wsReconnect=null, wsHost='';

function setLiveStatus(msg, cls){
  const el=document.getElementById('live-status');
  if(!el) return;
  el.textContent=msg; el.className='live-status '+cls;
}

function wsUpdateHeader(connected){
  const el=document.getElementById('hl-ws');
  const vl=document.getElementById('hlv-ws');
  if(!el||!vl) return;
  if(connected){
    el.style.display='flex';
    vl.textContent=wsHost;
  } else {
    el.style.display='none';
  }
}

function connectLive(){
  const inp=document.getElementById('live-ip');
  let addr=(inp.value||'').trim();
  if(!addr){ setLiveStatus('Enter an IP address first.','err'); return; }
  if(!addr.includes(':')) addr=addr+':8765';
  wsHost=addr;

  // Close existing
  if(ws){ ws.onclose=null; ws.close(); ws=null; }
  clearTimeout(wsReconnect);

  setLiveStatus('Connecting to ws://'+addr+' ...','con');
  wsOpen(addr);
}

function wsOpen(addr){
  try {
    ws=new WebSocket('ws://'+addr);
  } catch(e){
    setLiveStatus('Invalid address.','err'); return;
  }

  ws.onopen=()=>{
    setLiveStatus('⚡ Connected — waiting for scan data...','ok');
    wsUpdateHeader(true);
  };

  ws.onmessage=e=>{
    try{
      const data=JSON.parse(e.data);
      loadScan(data);
      setLiveStatus('⚡ Live — last update: '+new Date().toLocaleTimeString(),'ok');
      wsUpdateHeader(true);
    }catch(err){
      setLiveStatus('Received invalid data.','err');
    }
  };

  ws.onerror=()=>{
    setLiveStatus('Connection error — retrying in 5s...','err');
    wsUpdateHeader(false);
  };

  ws.onclose=()=>{
    wsUpdateHeader(false);
    setLiveStatus('Disconnected — retrying in 5s...','err');
    wsReconnect=setTimeout(()=>wsOpen(addr), 5000);
  };
}

// Auto-detect if served from Platine USB (ws-server.py sets window.PLATINE_WS_HOST)
window.addEventListener('load',()=>{
  if(window.PLATINE_WS_HOST){
    const inp=document.getElementById('live-ip');
    if(inp) inp.value=window.PLATINE_WS_HOST;
    wsHost=window.PLATINE_WS_HOST;
    wsOpen(window.PLATINE_WS_HOST);
  }
  
// Auto-load from URL if /live/{id}
(function() {
    const path = window.location.pathname;
    const match = path.match(/^\/live\/([a-z0-9]+)$/);
    if (match) {
        const sessionId = match[1];
        // Poll for data every 3 seconds
        Platine.startPolling(sessionId, function(res) {
            if (res.ok && res.data) {
                loadData(res.data);
            }
        });
    }
})();

