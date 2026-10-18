"""Oda ölçüleri (metre). X sağ, Y kameradan uzağa, Z yukarı. Kamera +Y'ye bakar."""

ROOM_HALF_W = 3.2        # iç genişlik 6.4 m
Y_BACK = 2.6             # arka duvarın iç yüzü
Y_FRONT = -5.0           # ön duvarın iç yüzü (kameranın arkası)
CEIL = 4.8               # tavan yüksekliği
WALL_T = 0.42            # duvar kalınlığı

WIN_HALF_W = 0.9         # pencere yarı genişliği
WIN_SILL = 1.15          # pencere denizliği yüksekliği
WIN_SPRING = 3.3         # kemerin başladığı yükseklik (kemer yarıçapı = WIN_HALF_W)
WIN_FRAME_Y = Y_BACK + 0.20   # kasanın duvar içindeki konumu
WIN_FRAME_W = 0.075      # kasa genişliği
WIN_FRAME_D = 0.07       # kasa derinliği

CASE_LOWER_D = 0.46      # kitaplık alt dolap derinliği
CASE_UPPER_D = 0.36      # üst raf derinliği
CASE_TOP = 3.86          # üst tabla yüksekliği
CASE_COUNTER = 0.90      # alt dolap tezgah üstü
CASE_SHELVES = 7         # tezgah ile üst tabla arası raf aralığı sayısı
CASE_INNER_X = 1.32      # arka kitaplıkların pencereye bakan uç noktası (|x|)
SIDE_CASE_Y0 = -0.9      # yan kitaplıkların başlangıcı (y)

DESK_Y = 1.95            # fişlik dolabının merkez y'si
