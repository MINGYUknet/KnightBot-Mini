/**
 * TicTacToe Game - Two player game
 */

const TicTacToe = require('../../utils/tictactoe');

// Store games globally
const games = {};

module.exports = {
  games, // Export for handler access
  name: 'tictactoe',
  aliases: ['ttt', 'xo'],
  category: 'fun',
  description: 'Play TicTacToe with another player - Type .ttt to start or join a game',
  usage: '.ttt [room name]',
  
  async execute(sock, msg, args, extra) {
    try {
      const sender = extra.sender;
      const from = extra.from;
      const text = args.join(' ').trim();
      
      // Check if player is already in a game
      const existingRoom = Object.values(games).find(room => 
        room.id.startsWith('tictactoe') && 
        [room.game.playerX, room.game.playerO].includes(sender)
      );
      
      if (existingRoom && existingRoom.state === 'BERMAIN') {
        await extra.reply('❌ Anda masih dalam permainan. Ketik *surrender* untuk keluar..');
        return;
      }
      
      // Look for existing waiting room
      let room = Object.values(games).find(room => 
        room.state === 'MENUNGGU' && 
        room.id.startsWith('tictactoe') &&
        (text ? room.name === text : !room.name)
      );
      
      if (room) {
        // Join existing room
        room.o = from;
        room.game.playerO = sender;
        room.state = 'BERMAIN';
        
        const arr = room.game.render().map(v => ({
          'X': '❎',
          'O': '⭕',
          '1': '1️⃣',
          '2': '2️⃣',
          '3': '3️⃣',
          '4': '4️⃣',
          '5': '5️⃣',
          '6': '6️⃣',
          '7': '7️⃣',
          '8': '8️⃣',
          '9': '9️⃣',
        }[v]));
        
        const str = `
🎮 *Permainan TicTacToe Dimulai!*

Waiting for @${room.game.currentTurn.split('@')[0]} untuk bermain...

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ *Room ID:* ${room.id}
▢ *Rules:*
• Buat 3 baris simbol secara vertikal, horizontal, atau diagonal untuk menang.
• Ketik angka (1-9) untuk menempatkan simbolmu
• Ketik *surrender* untuk menyerah
`;
        
        await sock.sendMessage(from, { 
          text: str,
          mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
        });
        
      } else {
        // Create new room
        room = {
          id: 'tictactoe-' + (+new Date),
          x: from,
          o: '',
          game: new TicTacToe(sender, 'o'),
          state: 'WAITING'
        };
        
        if (text) room.name = text;
        
        await sock.sendMessage(from, { 
          text: `⏳ *Menunggu lawan*\nType *.ttt ${text || ''}* untuk bergabung!`
        });
        
        games[room.id] = room;
      }
      
    } catch (error) {
      console.error('Kesalahan pada perintah tictactoe:', error);
      await extra.reply('❌ Terjadi kesalahan saat memulai permainan. Silakan coba lagi..');
    }
  },
};

// Handle game moves (called from handler)
async function handleTicTacToeMove(sock, msg, extra) {
  try {
    const sender = extra.sender;
    const from = extra.from;
    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || 
                 '';
    
    // Find player's game
    const room = Object.values(games).find(room => 
      room.id.startsWith('tictactoe') && 
      [room.game.playerX, room.game.playerO].includes(sender) && 
      room.state === 'BERMAIN'
    );
    
    if (!room) return false;
    
    const isSurrender = /^(surrender|menyerah)$/i.test(text);
    
    if (!isSurrender && !/^[1-9]$/.test(text)) return false;
    
    // Allow surrender at any time, not just during player's turn
    if (sender !== room.game.currentTurn && !isSurrender) {
      await sock.sendMessage(from, { 
        text: '❌ Bukan giliranmu!' 
      });
      return true;
    }
    
    let ok = isSurrender ? true : room.game.turn(
      sender === room.game.playerO,
      parseInt(text) - 1
    );
    
    if (!ok) {
      await sock.sendMessage(from, { 
        text: '❌ Langkah tidak valid! Posisi tersebut sudah ditempati.' 
      });
      return true;
    }
    
    let winner = room.game.winner;
    let isTie = room.game.turns === 9 && !winner;
    
    const arr = room.game.render().map(v => ({
      'X': '❎',
      'O': '⭕',
      '1': '1️⃣',
      '2': '2️⃣',
      '3': '3️⃣',
      '4': '4️⃣',
      '5': '5️⃣',
      '6': '6️⃣',
      '7': '7️⃣',
      '8': '8️⃣',
      '9': '9️⃣',
    }[v]));
    
    if (isSurrender) {
      // Set the winner to the opponent of the surrendering player
      winner = sender === room.game.playerX ? room.game.playerO : room.game.playerX;
      
      // Send a surrender message
      await sock.sendMessage(from, { 
        text: `🏳️ @${sender.split('@')[0]} telah menyerah! @${winner.split('@')[0]} memenangkan permainan!`,
        mentions: [sender, winner]
      });
      
      // Delete the game immediately after surrender
      delete games[room.id];
      return true;
    }
    
    let gameStatus;
    if (winner) {
      gameStatus = `🎉 @${winner.split('@')[0]} memenangkan permainan!`;
    } else if (isTie) {
      gameStatus = `🤝 Pertandingan berakhir imbang.!`;
    } else {
      gameStatus = `🎲 Giliranmu: @${room.game.currentTurn.split('@')[0]} (${sender === room.game.playerX ? '❎' : '⭕'})`;
    }
    
    const str = `
🎮 *TicTacToe Game*

${gameStatus}

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6).join('')}

▢ Player ❎: @${room.game.playerX.split('@')[0]}
▢ Player ⭕: @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• Ketik angka (1-9) untuk melakukan gerakanmu\n• Ketik *surrender* untuk menyerah' : ''}
`;
    
    const mentions = [
      room.game.playerX, 
      room.game.playerO,
      ...(winner ? [winner] : [room.game.currentTurn])
    ];
    
    await sock.sendMessage(room.x, { 
      text: str,
      mentions: mentions
    });
    
    if (room.x !== room.o) {
      await sock.sendMessage(room.o, { 
        text: str,
        mentions: mentions
      });
    }
    
    if (winner || isTie) {
      delete games[room.id];
    }
    
    return true;
  } catch (error) {
    console.error('Kesalahan dalam gerakan tictactoe:', error);
    return false;
  }
}

module.exports.handleTicTacToeMove = handleTicTacToeMove;

