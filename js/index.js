window.__utils = {
  loadCSS: function(src) {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = src;
    link.media = 'all';
    head.appendChild(link);
  },

  getIsMobile: function() {
    return !!(
      navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/webOS/i) ||
      navigator.userAgent.match(/iPhone/i) ||
      navigator.userAgent.match(/iPad/i) ||
      navigator.userAgent.match(/iPod/i) ||
      navigator.userAgent.match(/BlackBerry/i) ||
      navigator.userAgent.match(/Windows Phone/i)
    );
  },

  getBoardMainScale() {
    const originWidth = 590;
    const vw = document.body.clientWidth / 100;
    return ((74 * vw) / originWidth).toFixed(2);
  }
};

window.addEventListener('DOMContentLoaded', function() {
  const isMobile = window.__utils.getIsMobile();

  if (isMobile) {
    window.__utils.loadCSS('./css/mobile.css');

    const boardEle = $('#board_main');
    const boardWrapEle = $('#board_main_wrap');
    const playControlEle = $('#play_control');

    const boardScale = window.__utils.getBoardMainScale();
    boardEle.css('zoom', boardScale.toString());
    boardWrapEle.after(playControlEle);

    const controlbarBtnsEle = playControlEle.children('.buttons').children();

    setTimeout(() => {
      const controlbarEle = $('.controlbar');
      console.log('uuuu', controlbarEle);

      controlbarEle.append(controlbarBtnsEle);
    }, 0);
  }

  let board = null;
  let record_player = null;
  let boardObj = function() {
    // 棋盘的DOM对象，基本上棋子、棋盘逻辑都在这里面。
    let board = $('#board_main');

    let _obj = this;

    // 标记是不是ZJ
    _obj.zj = false;
    // 标记
    _obj.mark = {};
    //整个游戏的数据结构，包括对局进程、状态、双方等等。会通过页面变量或者Websocket推过来。
    //_obj.game_record = '';

    //字符串，当前局面记录。
    _obj.currgame = '';

    //字符串，记录终局状态。
    _obj.endgame = '';

    // 当前颜色，在初始化时会初始化为黑色
    _obj.curr_color = 'black';

    //当前手数，会被初始化为1
    _obj.curr_step = 1;

    // 标记是不是zj
    _obj.setZj = function(row) {
      let action = row['action'];
      if (action == 'RESET' || action == 'LOAD' || action == 'MOVE') {
        if (row['content'].length >= 2 && row['content'].substr(0, 2) == 'ZJ') {
          row['content'] = row['content'].substr(2, row['content'].length - 2);
          _obj.zj = true;
        }
      }
      return;
    };

    //load 一个游戏数据。
    _obj.load = function(game_record) {
      //为了播放声音，这里对比一下旧盘面和新load的盘面，决定是否播放一次声音
      //let play_sound = (_obj.currgame != game_data.game_record);
      //_obj.game_record = game_record;
      _obj.endgame = game_record;
      _obj.show_origin();
      /*if(play_sound)
      {
          pager.play_sound('Move');
      }*/
    };

    //自动切换模式。
    _obj.switch_mode = (function() {
      let _mode = 'game'; // game or analyze
      return function(mode) {
        if (mode == _mode) {
          return true;
        }
        _mode = mode;
        switch (mode) {
          case 'game':
            //board.removeClass("mode_analyze").addClass("mode_game");
            board.css('background-image', 'url(images/board.png)');
            break;
          case 'analyze':
            board.css('background-image', 'url(images/board-grey.png)');
            break;
          default:
            break;
        }
      };
    })();

    /**
     * @description 在指定位置标记字母。
     * @param  {string} coordinate 传入坐标。
     * @returns {boolean}
     */
    _obj.place_mark = function(mark_obj, is_add) {
      let target_cell = board.find('.' + mark_obj.coordinate);
      if (!target_cell.hasClass('blank')) {
        return false;
      }
      target_cell.removeClass('blank').addClass('mark').html(mark_obj.word);

      // _obj.mark.push(coordinate)
      if (is_add) {
        step = _obj.curr_step;
        if (_obj.mark.hasOwnProperty(step)) {
          _obj.mark[step].push(mark_obj);
        } else {
          _obj.mark[step] = [mark_obj];
        }
      }

      return true;
    };

    _obj.place_mark_step = function() {
      if (!_obj.mark.hasOwnProperty(_obj.curr_step)) {
        return;
      }
      let mark_obj = _obj.mark[_obj.curr_step];
      for (let i = 0; i < mark_obj.length; i++) {
        // let target_cell = board.find('.'+mark_obj[i].coordinate);
        // target_cell.removeClass('mark').addClass('blank').html('');
        _obj.place_mark(mark_obj[i], false);
      }
      return true;
    };

    _obj.clear_mark = function() {
      for (var key in _obj.mark) {
        let mark_obj = _obj.mark[key];
        for (let i = 0; i < mark_obj.length; i++) {
          let target_cell = board.find('.' + mark_obj[i].coordinate);
          if (!target_cell.hasClass('mark')) {
            continue;
          }

          target_cell.removeClass('mark').addClass('blank').html('');
        }
      }
    };

    /**
     * @description 在指定位置放置一枚棋子。
     * @param  {string} coordinate 传入坐标。
     * @param  {boolean} play_sound 是否播放声音
     * @returns {boolean}
     */
    _obj.place_stone = function(coordinate, play_sound) {
      black = null;
      if (_obj.zj == true) {
        black = coordinate.charAt(0) == '0' ? 'black' : 'white';
        // coordinate = coordinate.substr(1, 2)
      }

      if (black == null)
        _obj.curr_color = _obj.curr_color == 'black' ? 'white' : 'black';
      else _obj.curr_color = black;

      coo = _obj.zj == true ? coordinate.substr(1, 2) : coordinate;
      let target_cell = board.find('.' + coo);
      if (!target_cell.hasClass('blank')) {
        // _obj.currgame += coordinate;
        return false;
      }
      target_cell
        .removeClass('blank')
        .addClass(_obj.curr_color)
        .html(_obj.curr_step++);
      /*try rand stone*/
      if (_obj.curr_color == 'white') {
        target_cell.css({
          'background-position':
            '0px ' + (-37 * Math.floor(Math.random() * 9)).toString() + 'px'
        });
      }

      _obj.currgame += coordinate;
      if (_obj.currgame != _obj.endgame.substr(0, _obj.currgame.length)) {
        _obj.endgame = _obj.currgame;
        //在改变了endgame时，如果不是playing ,则都进入研究模式。
        //record_player.pause();
        //_obj.switch_mode('analyze');
      }
      if (play_sound) {
        //pager.play_sound('Move');
      }

      return true;
    };

    _obj.get_current_board = function() {
      return _obj.currgame;
    };

    /**
     * 右键和回退按钮的事件，往回退一个棋子。并不产生任何Ajax，这不是悔棋操作。
     * @returns {boolean}
     */
    _obj.move_pre = function() {
      if (_obj.currgame) {
        let len = 2;
        if (_obj.zj == true) {
          len = 3;
        }
        let last_move = _obj.currgame.substr(_obj.currgame.length - len, len);
        //这个棋子拿起来。。。
        let target_cell = board.find(
          '.' + (_obj.zj == true ? last_move.substr(1, 2) : last_move)
        );
        target_cell
          .removeClass('black white')
          .addClass('blank')
          .removeAttr('style')
          .html('');
        _obj.curr_step--;
        _obj.curr_color = _obj.curr_color == 'black' ? 'white' : 'black';
        _obj.currgame = _obj.currgame.substr(0, _obj.currgame.length - len);

        return true;
      }
      return false;
    };

    /**
     * 根据endgame，一步一步走下去，把整个棋局展示出来。
     * @returns {boolean}
     */
    _obj.move_next = function() {
      if (_obj.currgame != _obj.endgame) {
        let nextstep = _obj.endgame.substr(
          _obj.currgame.length,
          _obj.zj == true ? 3 : 2
        );
        _obj.place_stone(nextstep);
        return true;
      }
      return false;
    };

    /**
     * 回退到空棋盘状态。
     */
    _obj.board_clean = function() {
      while (_obj.move_pre()) {}
    };

    /**
     * 根据目前的棋局记录一路Next到局面结束的状态。
     */
    _obj.board_end = function() {
      while (_obj.move_next()) {}
    };

    /**
     * 根据game_record 初始化棋盘的文字信息和棋盘Game信息
     */
    _obj.show_origin = function() {
      //_obj.switch_mode('game');
      _obj.board_clean();
      //_obj.endgame = _obj.game_record;
      _obj.board_end();
    };

    /**
     * 画棋盘和按钮。绑定右键事件。
     * 整个页面载入的时候会执行一次。仅此一次。
     */
    _obj.init_board = function() {
      _obj.currgame = '';
      _obj.curr_color = 'white';
      _obj.curr_step = 1;

      board.bind('contextmenu', function() {
        return false;
      });
      for (let i = 15; i >= 1; i--) {
        //insert a row
        let newrow = $(document.createElement('div'));
        newrow.addClass('row');
        for (let j = 1; j <= 15; j++) {
          //insert a cross point
          let newcell = $(document.createElement('div'));
          newcell.addClass(j.toString(16) + i.toString(16));
          newcell.attr('alt', j.toString(16) + i.toString(16));
          newcell.addClass('blank');
          newrow.append(newcell);
        }
        board.append(newrow);
      }
      board.find('.row div').click(function() {
        let coordinate = $(this).attr('alt');
        let c_x = parseInt(coordinate.charAt(0), 16) + 96;
        let c_y = parseInt(coordinate.charAt(1), 16);
        let show_x = String.fromCharCode(c_x);
        if (show_x == 'l') show_x = 'L';
        let show_content = show_x + c_y.toString();
        record_player.sysMsg('点击: ' + show_content);

        return true;
      });
      //进度条bar
      let _ul = $(document.createElement('ul'));
      for (let i = 1; i <= 99; i++) {
        $(document.createElement('li'))
          .attr('title', '' + i + '%')
          .appendTo(_ul);
      }
      _ul.appendTo($('#progress'));
      //生成控制按钮
      let controlbar = $(document.createElement('div'));
      controlbar.addClass('controlbar');
      board.after(controlbar);

      function parsingCurrgame(input) {
        const parsingMap = {
          1: {
            x: 'a',
            y: '1'
          },
          2: {
            x: 'b',
            y: '2'
          },
          3: {
            x: 'c',
            y: '3'
          },
          4: {
            x: 'd',
            y: '4'
          },
          5: {
            x: 'e',
            y: '5'
          },
          6: {
            x: 'f',
            y: '6'
          },
          7: {
            x: 'g',
            y: '7'
          },
          8: {
            x: 'h',
            y: '8'
          },
          9: {
            x: 'i',
            y: '9'
          },
          a: {
            x: 'j',
            y: '10'
          },
          b: {
            x: 'k',
            y: '11'
          },
          c: {
            x: 'l',
            y: '12'
          },
          d: {
            x: 'm',
            y: '13'
          },
          e: {
            x: 'n',
            y: '14'
          },
          f: {
            x: 'o',
            y: '15'
          }
        };
        let res = '';
        const currgameArr = input.toString().split('');

        currgameArr.forEach((i, k) => {
          if (k % 2 === 0) {
            res += parsingMap[i].x;
          } else {
            res += parsingMap[i].y;
          }
        });

        return res;
      }

      // 按钮
      $(document.createElement('button'))
        .addClass('button')
        .text('计算分析')
        .click(function() {
          record_player.pause();

          const gameBaseUrl = '/ku10/gomoku-calculator/#/';
          const url = gameBaseUrl + parsingCurrgame(_obj.currgame);
          window.open(
            url,
            'analyze',
            'height=660,width=660,fullscreen=0,location=0,menubar=0,resize=0',
            true
          );
        })
        .appendTo(controlbar);

      $(document.createElement('button'))
        .addClass('button show')
        .text('隐藏数字')
        .click(function() {
          let _btn = $(this);
          if (_btn.hasClass('show')) {
            _btn.text('显示数字').removeClass('show');
            $('<style>')
              .attr('id', 'hide_number')
              .html('.row div{text-indent:-999px;overflow:hidden;}')
              .appendTo('head');
          } else {
            _btn.text('隐藏数字').addClass('show');
            $('#hide_number').remove();
          }
        })
        .appendTo(controlbar);

      // 创建下拉选择
      (function() {
        const options = [
          { val: 1, text: 'RIF' },
          { val: 25, text: 'Taraguchi-10' }
        ];

        const selectEle = $('<select id="query-actual-combat-chess">');
        $(options).each(function() {
          selectEle.append(
            $('<option>').attr('value', this.val).text(this.text)
          );
        });
        selectEle.appendTo(controlbar);
      })();

      // 查询实战棋谱按钮
      $(document.createElement('button'))
        .addClass('button')
        .text('查实战棋谱')
        .click(function() {
          record_player.pause();
          const val = $('#query-actual-combat-chess').val();
          const url = `https://www.renju.net/game/search?moves=${parsingCurrgame(
            _obj.currgame
          )}&rule=${val}`;
          window.open(
            url,
            'analyze',
            'height=660,width=660,fullscreen=0,location=0,menubar=0,resize=0',
            true
          );
        })
        .appendTo(controlbar);
    };
  };

  let recordPlayer = function(boardHandler) {
    let obj = this;
    this.pointer = 0; //当前播放到第几个action
    this.timer = 0; //计时器
    this.record = [];
    this.status = 0;
    this.boardHandler = boardHandler;
    this._progress = -1;
    obj.load = function(record) {
      obj.pause();
      obj.record = record;
      obj.pointer = 0;
      obj.timer = 0;
      obj.status = 0;
      obj._progress = -1;
      this.boardHandler.load('');
      $('#chat_content').empty();
      $('#progress>div').css('width', '0%');
      obj.play();
    };
    obj.play = function() {
      console.log(obj._progress);
      if (typeof obj.record[obj.pointer] == 'undefined') {
        return false;
      }
      if (!obj.renderRow(obj.record[obj.pointer])) {
        obj.sysMsg('播放失败');
        return false;
      }
      let now = obj.record[obj.pointer]['time_int'];
      obj.pointer++;
      //计算progress
      let progress_percent = 0;
      if (obj.pointer % 5 == 0 && obj.record.length > 0) {
        progress_percent = parseInt((obj.pointer * 100) / obj.record.length);
        $('#progress>div').css('width', progress_percent + '%');
        if (obj._progress != -1 && progress_percent >= obj._progress) {
          obj._progress = -1;
          //obj.pause();
        }
      }
      //progress 结束
      if (typeof obj.record[obj.pointer] == 'object') {
        obj.status = 1;
        let delta_time = obj.record[obj.pointer]['time_int'] - now;
        if (obj.record[obj.pointer] == 'RESET') {
          delta_time = 1;
        }
        delta_time = delta_time <= 5 ? delta_time : 5;
        let speed = parseInt($('select[name=speed]').val());
        //progress快进逻辑
        _timeout = obj._progress == -1 ? 10 + speed * delta_time : 3;
        obj.timer = setTimeout(function() {
          obj.play();
        }, _timeout);
      } else {
        obj.sysMsg('播放完毕');
      }
    };
    obj.pause = function() {
      if (obj.timer) {
        obj.status = 0;
        clearTimeout(obj.timer);
        obj.timer = 0;
        obj.sysMsg('播放暂停');
      }
    };
    obj.gotoProgress = function(i) {
      if (i < 0 || i > 99) {
        return;
      }
      //类似于 load
      obj.pause();
      obj.pointer = 0;
      obj.timer = 0;
      obj.status = 0;
      obj._progress = i;
      this.boardHandler.load('');
      $('#chat_content').empty();
      $('#progress>div').css('width', '0%');
      obj.play();
    };

    obj.renderRow = function(row) {
      //console.log(row);
      this.boardHandler.setZj(row);
      let function_name = 'action' + row['action'];
      let $return = false;
      if (typeof obj[function_name] == 'function') {
        $return = obj[function_name](row);
      } else {
        //console.log(row);
      }
      if ($('#chat_content').find('li').length > 150) {
        for (let i = 1; i <= 100; i++) {
          $('#chat_content').find('li:first').remove();
        }
      }
      $('#chat_content_list').scrollTop(
        $('#chat_content_list')[0].scrollHeight -
        $('#chat_content_list').height()
      );
      return $return;
    };

    /**
     * 以下是各种事件的处理方法。
     */
    obj.actionMARK = function(row) {
      start = 2;
      for (i = 0; i < row.content.length - 2; i += 3) {
        let c_w = row.content.charAt(start + i + 2);
        // console.log(c_x + "\t" + c_y + "\t" + c_w)
        content = row.content.substr(start + i, 2);
        this.boardHandler.place_mark({ coordinate: content, word: c_w }, true);

        obj.sysMsg(
          row.user + ' - 标记 ' + obj.getPoint(content) + '(' + c_w + ')'
        );
      }
      return true;
    };

    obj.actionRESET = function() {
      this.boardHandler.load('');
      return true;
    };

    obj.actionTALK = function(row) {
      let _name = $('<span>').html(row.user).addClass('chat-name');
      let _content = $('<span>').html(row.content).addClass('chat-content');
      if (row.user == 'RenjuTeacher' || row.user == 'GrandMaster') {
        _content.addClass('teacher');
      }
      let li = $('<li>');
      li.append(_name).append(':&nbsp;').append(_content);
      li.appendTo($('#chat_content'));
      return true;
    };
    obj.actionMOVE = function(row) {
      start = 0;
      if (this.boardHandler.zj) {
        start = 1;
      }

      // let c_x = parseInt(row.content.charAt(start + 0),16) + 96;
      // let c_y = parseInt(row.content.charAt(start + 1),16);

      // let show_x = String.fromCharCode(c_x);
      // if(show_x == 'l') show_x = 'L';

      // let show_content = this.boardHandler.curr_step.toString() + ' - ' + show_x + c_y.toString();

      // let _content = $("<span>").html(row.user + ': ' + show_content).addClass("chat-move");
      // let li = $("<li>");
      // li.append(_content);
      // li.appendTo($("#chat_content"));

      this.boardHandler.clear_mark();
      this.boardHandler.place_stone(row.content);

      obj.sysMsg(
        row.user +
        ' - ' +
        (this.boardHandler.curr_color == 'black' ? '黑' : '白') +
        obj.getPoint(row.content.substr(start, 2))
      );

      return true;
    };

    obj.actionCHECKRESULT = function(row) {
      obj.sysMsg('点名结束，以下学生答到：' + row.content);
      return true;
    };

    obj.actionEMOTE = function(row) {
      return obj.actionTALK(row);
    };

    obj.actionGOTO = function(row) {
      this.boardHandler.clear_mark();
      while (
        this.boardHandler.get_current_board().length >
        row.content * (this.boardHandler.zj ? 3 : 2)
        ) {
        if (!this.boardHandler.move_pre()) break;
      }
      while (
        this.boardHandler.get_current_board().length <
        row.content * (this.boardHandler.zj ? 3 : 2)
        ) {
        if (!this.boardHandler.move_next()) break;
      }
      this.boardHandler.place_mark_step();
      obj.sysMsg(row.user + ' - 跳转到第' + row.content + '手');
      return true;
    };

    obj.actionBACK = function(row) {
      obj.sysMsg(row.user + ' - 回退');
      if (this.boardHandler.zj && this.boardHandler.curr_step <= 2) {
        return true;
      }

      this.boardHandler.clear_mark();
      this.boardHandler.move_pre();
      this.boardHandler.place_mark_step();

      return true;
    };
    obj.actionFIRST = function(row) {
      this.boardHandler.clear_mark();
      this.boardHandler.board_clean();
      this.boardHandler.move_next();
      this.boardHandler.place_mark_step();
      obj.sysMsg(row.user + ' - 回第一手');
      return true;
    };
    obj.actionCREDIT = function(row) {
      obj.sysMsg('本次课程拿到学分的同学：' + row.content);
      return true;
    };
    obj.actionNEXT = function(row) {
      this.boardHandler.clear_mark();
      this.boardHandler.move_next();
      this.boardHandler.place_mark_step();
      obj.sysMsg(row.user + ' - 前进');
      return true;
    };
    obj.actionCLEAR = function(row) {
      this.boardHandler.clear_mark();
      this.boardHandler.load('');
      obj.sysMsg(row.user + ' - 清空棋盘');
      return true;
    };
    obj.actionLOAD = function(row) {
      this.boardHandler.clear_mark();
      this.boardHandler.load(row.content);
      obj.sysMsg(
        row.user + ' - 调入' + (obj.boardHandler.curr_step - 1) + '手棋'
      );
      return true;
    };
    obj.actionLAST = function(row) {
      this.boardHandler.clear_mark();
      this.boardHandler.board_end();
      this.boardHandler.place_mark_step();
      obj.sysMsg(row.user + ' - 到最后一手');
      return true;
    };
    obj.getPoint = function(coordinate) {
      // start =0
      // if(this.boardHandler.zj){
      //     start = 1
      // }

      let c_x = parseInt(coordinate.charAt(0), 16) + 96;
      let c_y = parseInt(coordinate.charAt(1), 16);

      let show_x = String.fromCharCode(c_x);
      if (show_x == 'l') show_x = 'L';

      return show_x.toUpperCase() + '' + c_y;
    };

    //事件处理结束
    obj.sysMsg = function(msg) {
      let li = $('<li>');
      $('<span>').addClass('chat-sys').html(msg).appendTo(li);
      li.appendTo($('#chat_content'));
      $('#chat_content_list').scrollTop(
        $('#chat_content_list')[0].scrollHeight -
        $('#chat_content_list').height()
      );
    };
  };

  //1.new出对象
  board = new boardObj();
  record_player = new recordPlayer(board);
  $(document).ready(function() {
    board.init_board();
    $('#progress>ul>li').each(function(idx) {
      $(this).click(function() {
        record_player.gotoProgress(idx + 1);
        //console.log(idx+1)
      });
    });
    let load_game = function(source, callback) {
      $.getJSON('json/' + source, {}, function(_data) {
        //play data
        //console.log(source);
        record_player.load(_data);
        if (typeof callback == 'function') {
          callback();
        }
      });
    };
    let auto_play = function() {
      console.log(window.location.hash);
      if (window.location.hash.charAt(0) == '#') {
        console.log(window.location.hash.charAt(0));
        let autoplay_num = parseInt(window.location.hash.substring(1));
        console.log(autoplay_num);
        console.log($('#lesson_list>ul li').length);
        if (
          autoplay_num >= 0 &&
          autoplay_num < $('#lesson_list>ul li').length
        ) {
          $('#lesson_list>ul')
            .find('#play_link_' + autoplay_num)
            .click();
        }
      } else {
        load_game('20181229.json', function() {
          //record_player.sysMsg("欢迎！");
        });
      }
    };
    $.getJSON('trans.json?d=20190104', {}, function(_data) {
      for (let i in _data) {
        let _tmp = _data[i];
        let _link = $(document.createElement('a'));
        _link
          .attr('title', _tmp['show_name'])
          .attr('data-source', _tmp['data'])
          .attr('href', '#' + i)
          .attr('id', 'play_link_' + i)
          .html(_tmp['show_name']);
        _link.click(function() {
          $('title').text($(this).text() + ' @ 连珠课程在线学习');
          record_player.sysMsg('Loading......');
          loadCounter();
          load_game($(this).attr('data-source'), function() {
            record_player.sysMsg('开始播放' + $('title').text());
          });
        });
        if (typeof _tmp['origin'] == 'boolean' && _tmp['origin']) {
          $('<li></li>').append(_link).prependTo($('#lesson_list>ul'));
        } else {
          $('<li></li>').append(_link).appendTo($('#lesson_list>ul'));
        }
      }
      auto_play();
    });
    $('.btn_play').click(function() {
      if (record_player.status == 0) {
        record_player.sysMsg('继续播放');
        record_player.play();
      }
    });
    $('.btn_pause').click(function() {
      if (record_player.status == 1) {
        record_player.pause();
      }
    });
  });
});
