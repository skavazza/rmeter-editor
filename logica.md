Prompt para Criar Nova Skin (Rainmeter)

    📋 Regra de Negócio

    O fluxo de criação de uma nova skin segue estas etapas:

     1. Coleta de dados do usuário via formulário:
        - nome_skin (obrigatório) — Ex: "MinhaNovaSkin"
        - caminho_base (obrigatório) — Ex: ~/Documents/Rainmeter/Skins
        - autor (opcional)
        - versão (default: "1.0")
        - descrição (opcional)

     2. Validação: nome e caminho base são obrigatórios

     3. Verificação: se a pasta {caminho_base}/{nome_skin} já existe, abortar com erro

     4. Criação da estrutura de pastas:

     1    {caminho_base}/{nome_skin}/
     2    ├── @Resources/
     3    │   ├── Fonts/
     4    │   └── Images/
     5    └── {nome_skin}.ini

     5. Criação do arquivo `Variables.inc` dentro de @Resources/:

     1    ; Variáveis Globais
     2    [Variables]

     6. Criação do arquivo `.ini` com o template:

      1    [Rainmeter]
      2    Update=1000
      3    AccurateText=1
      4    DynamicWindowSize=1
      5 
      6    [Metadata]
      7    Name={nome_skin}
      8    Author={autor}
      9    Information={descrição}
     10    Version={versão}
     11    License=Creative Commons BY-NC-SA 4.0
     12 
     13    [Variables]
     14    @Include=#@#Variables.inc
     15 
     16    [MeterBackground]
     17    Meter=Shape
     18    Shape=Rectangle 0,0,200,100 | Fill Color 0,0,0,150 | StrokeWidth 0
     19    X=0
     20    Y=0
     21 
     22    [MeterHello]
     23    Meter=String
     24    Text=Nova Skin: {nome_skin}
     25    FontSize=12
     26    FontColor=255,255,255,255
     27    X=10
     28    Y=10
     29    AntiAlias=1

     7. Retorno: sucesso (bool), caminho_arquivo_ini (str) | mensagem_erro (str)

    ---

    🔧 Implementação Python (Referência)

      1 import os
      2 
      3 def criar_nova_skin(caminho_base, nome_skin, autor="", versao="1.0", descricao=""):
      4     """
      5     Cria a estrutura de pastas e arquivo inicial para uma nova skin Rainmeter.
      6     Retorna (sucesso: bool, caminho_ou_erro: str)
      7     """
      8     skin_dir = os.path.join(caminho_base, nome_skin)
      9 
     10     if os.path.exists(skin_dir):
     11         return False, f"A pasta '{nome_skin}' já existe em {caminho_base}."
     12 
     13     try:
     14         # 1. Criar pastas
     15         os.makedirs(skin_dir)
     16         resources_dir = os.path.join(skin_dir, "@Resources")
     17         os.makedirs(resources_dir)
     18         os.makedirs(os.path.join(resources_dir, "Fonts"))
     19         os.makedirs(os.path.join(resources_dir, "Images"))
     20 
     21         # 2. Criar Variables.inc
     22         with open(os.path.join(resources_dir, "Variables.inc"), "w", encoding="utf-8") as f:
     23             f.write("; Variáveis Globais\n[Variables]\n")
     24
     25         # 3. Criar arquivo .ini
     26         ini_path = os.path.join(skin_dir, f"{nome_skin}.ini")
     27         template = f"""[Rainmeter]
     28 Update=1000
     29 AccurateText=1
     30 DynamicWindowSize=1
     31
     32 [Metadata]
     33 Name={nome_skin}
     34 Author={autor}
     35 Information={descricao}
     36 Version={versao}
     37 License=Creative Commons BY-NC-SA 4.0
     38
     39 [Variables]
     40 @Include=#@#Variables.inc
     41
     42 [MeterBackground]
     43 Meter=Shape
     44 Shape=Rectangle 0,0,200,100 | Fill Color 0,0,0,150 | StrokeWidth 0
     45 X=0
     46 Y=0
     47
     48 [MeterHello]
     49 Meter=String
     50 Text=Nova Skin: {nome_skin}
     51 FontSize=12
     52 FontColor=255,255,255,255
     53 X=10
     54 Y=10
     55 AntiAlias=1
     56 """
     57         with open(ini_path, "w", encoding="utf-8") as f:
     58             f.write(template)
     59
     60         return True, ini_path
     61
     62     except Exception as e:
     63         return False, str(e)

    ---

    📝 Exemplo de Uso

      1 sucesso, resultado = criar_nova_skin(
      2     caminho_base="C:/Users/User/Documents/Rainmeter/Skins",
      3     nome_skin="MinhaSkin",
      4     autor="Funbio",
      5     versao="1.0",
      6     descricao="Minha primeira skin"
      7 )
      8 
      9 if sucesso:
     10     print(f"Skin criada em: {resultado}")
     11 else:
     12     print(f"Erro: {resultado}")

    ---

    🔑 Pontos Chave


    ┌──────────────────────┬──────────────────────────────────────────────────────────────────┐
    │ Conceito             │ Detalhe                                                          │
    ├──────────────────────┼──────────────────────────────────────────────────────────────────┤
    │ Encoding             │ Sempre utf-8 na escrita dos arquivos                             │
    │ Template             │ Seção [Rainmeter], [Metadata], [Variables] + 2 meters de exemplo │
    │ @Resources           │ Pasta com subpastas Fonts/ e Images/ + arquivo Variables.inc     │
    │ Validação            │ Verificar se pasta já existe antes de criar                      │
    │ Include de variáveis │ @Include=#@#Variables.inc no .ini (padrão Rainmeter)             │
    └──────────────────────┴──────────────────────────────────────────────────────────────────┘


    ---