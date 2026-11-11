// =====================================================================
// FALAS DOS PERSONAGENS — edite à vontade!
// ---------------------------------------------------------------------
// • Cada lista tem várias opções; o jogo sorteia uma.
// • {oponente} é trocado pelo nome do adversário (ex.: "Carlos").
// • Mantenha as frases curtas (até ~45 letras) para caber no balão.
// • Para acrescentar uma frase, copie uma linha, troque o texto e
//   não esqueça a vírgula no final.
// =====================================================================
window.FF_DIALOGUE = {
  // Conversa antes do 1º round. "p1" = quem está à esquerda, "p2" = à direita.
  // A chave é "lutadorDaEsquerda>lutadorDaDireita".
  intro: {
    'juraci>carlos': [
      [['p1', 'Carlos! Saiu da dieta de novo?'], ['p2', 'Vó, é só um pedacinho de bolo...'], ['p1', 'Então vai ter que merecer!']],
      [['p1', 'Quem mexeu no meu bolo de cenoura?'], ['p2', 'Eu não fui... foi o Pedro!'], ['p1', 'Tá com cobertura no bigode, menino!']],
      [['p2', 'Vó, hoje eu tô inspirado!'], ['p1', 'Inspirado tá meu bolo no forno.'], ['p1', 'Vem que eu te ensino!']]
    ],
    'carlos>juraci': [
      [['p1', 'Vó, cadê aquele bolo de cenoura?'], ['p2', 'Só depois de lavar a louça!'], ['p1', 'Então vamos resolver na luta!']],
      [['p1', 'Hoje a padaria é minha, vó!'], ['p2', 'Ah é? Vem buscar, meu filho!']],
      [['p2', 'Comeu a pizza toda sozinho, Carlos?'], ['p1', 'Sobrou a borda... pra você!'], ['p2', 'Ah, agora vai apanhar!']]
    ],
    'juraci>juraci': [
      [['p1', 'Ué! Quem é essa aí?'], ['p2', 'Eu sou a Juraci original!'], ['p1', 'Original é meu bolo de cenoura!']]
    ],
    'carlos>carlos': [
      [['p1', 'Ei, você roubou minha roupa?'], ['p2', 'Fica melhor em mim!'], ['p1', 'Só se for na luta!']]
    ]
  },

  juraci: {
    special: ['BOLO DE CENOURA!', 'Toma bolo quentinho!', 'Com cobertura de chocolate!', 'Saiu do forno agora!'],
    combo: ['Respeita a vó!', 'Isso é pra aprender!', 'Olha a educação!', 'Tá pensando que é bagunça?'],
    knockdown: ['Ai, minha coluna!', 'Isso não se faz com a vó!'],
    win: ['Quem manda nesta cozinha sou eu!', 'Agora vai lavar a louça!', 'Vem comer bolo, vem!', 'Família é tudo, mas a vó é mais!'],
    lose: ['Ai, ai... me ajuda a levantar!', 'Vou contar pra sua mãe!'],
    formEnd: []
  },

  carlos: {
    special: ['COMBO DO CHUTE!'],
    combo: ['Tá vendo, vó?', 'Esse é o tal do combo!', 'Treinei no quintal!'],
    knockdown: ['Tô vendo estrelas...', 'Ai! Essa doeu!'],
    win: ['Família é tudo... mas a vitória é minha!', 'Depois dessa, mereço uma pizza!', 'Foi mal, vó! Te amo!'],
    lose: ['Tô vendo estrelas...', 'Só mais um pedaço de bolo e eu volto...'],
    // Transformação Gordão: primeiro anuncia a comida, depois mastiga, depois engorda.
    eatCake: ['Hmm... bolo da vó!', 'Olha esse bolo de cenoura!'],
    eatPizza: ['Hmm... pizza de calabresa!', 'Só uma fatia de pizza...'],
    chew: ['NHAC! NHAC! NHAC!', 'Nham nham nham!'],
    fat: ['GORDÃÃÃO!', 'A camisa ficou apertada!', 'Agora eu tô pesado!'],
    // Transformação Modo Fé: batismo com água e luz.
    baptize: ['Senhor, me dá força!', 'Hoje eu me batizo!'],
    blessed: ['Batizado e abençoado! ALELUIA!', 'Aleluia! Tô blindado!', 'Glória! Agora ninguém me derruba!'],
    formEnd: ['Ufa, voltou o tanquinho!', 'Passou o efeito...']
  }
};
