// some layouts
function setup_tabs() {
    $('#codetabs').tabs({
        activate: function (event, ui) {
        }
    });

    $('#outputtabs').tabs({
        activate: function (event, ui) {
            const active = $('#outputtabs').tabs('option', 'active');
            if (active == 0)  {
                document.querySelectorAll('a[href="#console"]')[0].style.color = 'black';
            } else if (active == 1) {
                document.querySelectorAll('a[href="#output"]')[0].style.color = 'black';
            } else if (active == 2) {
                document.querySelectorAll('a[href="#tcpdump"]')[0].style.color = 'black';
            }
        }
    });
}

function get_console_size() {
    console_window = document.getElementById('console');
    const cols = Math.floor(console_window.offsetWidth / 10);
    const rows = Math.floor(console_window.offsetHeight / 19);

    return { cols, rows };
}

function on_window_resize() {
    const { cols, rows } = get_console_size();

    client.terminals.console.resize(cols, rows);
    client.terminals.code.resize(cols, rows);
    client.terminals.tcpdump.resize(cols, rows);
}

function create_editors() {

    // editors
    ace.require('ace/ext/language_tools');
    client.range = ace.require('ace/range').Range;
    client.editors = [];

    // pcap editor
    client.editors.push(ace.edit('PCAP'));
    client.editors[0].setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    });

    client.editors[0].setShowPrintMargin(false);
    client.editors[0].session.setMode('ace/mode/python');
    client.editors[0].setValue(document.getElementById('pcapcode').innerHTML, -1);

    // streams editor
    client.editors.push(ace.edit('STREAMS'));
    client.editors[1].setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    });

    client.editors[1].setShowPrintMargin(false);
    client.editors[1].session.setMode('ace/mode/python');
    client.editors[1].setValue(document.getElementById('streamscode').innerHTML, -1);
}


function create_terminals() {

    Terminal.colors[256] = '#ffffff';
    Terminal.colors[257] = '#000000';

    client.terminals = {};

    const { cols, rows } = get_console_size();

    client.terminals.console = new Terminal({
        screenKeys: true,
        useStyle: true,
        cols,
        rows,
    });

    client.terminals.code = new Terminal({
        screenKeys: true,
        useStyle: true,
        cols,
        rows,
    });

    client.terminals.tcpdump = new Terminal({
        screenKeys: true,
        useStyle: true,
        cols,
        rows,
    });

    Terminal.colors[256] = '#ffffff';
    Terminal.colors[257] = '#000000';

    client.terminals.console.open(document.getElementById('console'));
    client.terminals.code.open(document.getElementById('output'));
    client.terminals.tcpdump.open(document.getElementById('tcpdump'));

    // register some events
    client.terminals.console.on('data', function(data) {
        client.socket.emit('console-input', data);
	});
}


function create_socket() {
    // Connect to the socket.io server
    client.socket = io.connect('http://localhost:7171');

    // disconnect
    client.socket.on('disconnect', deinit);

    // console output
    client.socket.on('console-output', function(data) {
        client.terminals.console.write(data);

        if ($('#outputtabs').tabs('option', 'active') != 0) {
            document.querySelectorAll('a[href="#console"]')[0].style.color = 'red';
        }
    });

    // code output
    client.socket.on('code-run-output', function(data) {
        const ss = data.split('\n');
        for (let s in ss) {
            client.terminals.code.writeln(ss[s]);
        }

        if ($('#outputtabs').tabs('option', 'active') != 1) {
            document.querySelectorAll('a[href="#output"]')[0].style.color = 'red';
        }
    })

    // tcpdump output
    client.socket.on('tcpdump-output', function(data) {
        client.terminals.tcpdump.write(data);

        if ($('#outputtabs').tabs('option', 'active') != 2) {
            document.querySelectorAll('a[href="#tcpdump"]')[0].style.color = 'red';
        }

    });
}


function onRunClick() {
    // set focus
    //$("#outputtabs").tabs("option", "active", 1);

    // get the current active tab
    code_tab = $('#codetabs').tabs('option', 'active');
    editor = client.editors[code_tab];

    code = editor.session.getValue();
    client.terminals.code.write('\033[2J');
    client.terminals.code.write('\033[H');
    client.terminals.code.write('Launching script:\r\n\n');
    client.socket.emit('code-run-input', code);
}


function onStopClick() {
    client.socket.emit('code-run-input', 'ESC');
}

function setup_buttons() {
    document.getElementById('stopbutton').onclick = onStopClick;
    document.getElementById('runbutton').onclick = onRunClick;
}

function init() {
    setup_tabs();
    setup_buttons();

    create_socket();
    create_terminals();
    create_editors();

    client.terminals.console.write('Allocating TRex Docker container...\r\n\n');
    client.terminals.console.write('Starting TRex Server...\r\n\n');
}

function deinit() {
    client.terminals.console.destroy();
    client.terminals.code.destroy();
}

client = {};
init();
