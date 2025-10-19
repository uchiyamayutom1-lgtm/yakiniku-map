// ===================================================================
// 焼肉マップ - Places API (New) 完全準拠版
// ===================================================================

let map;
let marker;

// 地図の初期化関数 (現在地取得機能を追加)
async function initMap() {
    // デフォルト位置: 札幌市中央区
    const defaultLocation = { lat: 43.0645, lng: 141.3469 }; 
    let currentLocation = defaultLocation;

    // 1. ブラウザの現在地取得APIを使用
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // 成功した場合
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                initializeMapAndSearch(currentLocation);
            },
            (error) => {
                // 拒否または失敗した場合
                console.error("現在地の取得に失敗しました。デフォルト位置を使用します。", error);
                initializeMapAndSearch(defaultLocation);
            }
        );
    } else {
        // Geolocationがサポートされていない場合
        console.error("このブラウザはGeolocationをサポートしていません。デフォルト位置を使用します。");
        initializeMapAndSearch(defaultLocation);
    }
}

// 地図の初期化と検索を実行するヘルパー関数
function initializeMapAndSearch(location) {
    // 地図の初期化
    map = new google.maps.Map(document.getElementById('map'), {
        center: location,
        zoom: 13,
    });

    // 現在地のマーカーを設定
    marker = new google.maps.Marker({
        position: location,
        map: map,
        title: '現在地',
    });

    // 焼肉屋の検索を実行
    searchYakinikuPlaces(location); // 関数名を変更
}


// 焼肉店検索関数 (検索クエリを「焼肉」に変更)
async function searchYakinikuPlaces(location) { // 関数名を変更
    const statusElement = document.getElementById('gallery-status');
    const galleryElement = document.getElementById('ramen-gallery'); // IDはそのまま使用
    
    if (statusElement) statusElement.textContent = '🥩 焼肉屋を検索中...';
    if (galleryElement) galleryElement.innerHTML = ''; 

    try {
        const service = new google.maps.places.PlacesService(map); 

        const request = {
            location: location,
            radius: 1000, 
            query: '焼肉', // **ここを「焼肉」に変更！**
        };

        service.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                // 検索成功
                if (statusElement) statusElement.textContent = `✅ 検索結果：${results.length}件の焼肉屋が見つかりました。`;
                results.forEach(place => {
                    createYakinikuCard(place, map); // 関数名を変更
                });
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                if (statusElement) statusElement.textContent = '検索結果が見つかりませんでした。';
            } else if (status === 'APITARGETBLOCKEDMAPERROR' || status === 'REQUEST_DENIED') {
                if (statusElement) statusElement.textContent = '【最終エラー】APIキーの制限設定とHTMLのキーが正しいか最終確認が必要です。';
            } else {
                if (statusElement) statusElement.textContent = `検索に失敗しました。ステータス: ${status}`;
            }
        });

    } catch (error) {
        if (statusElement) statusElement.textContent = '致命的な初期化エラーが発生しました。コンソールを確認してください。';
        console.error('Fatal Initialization Error:', error);
    }
}


// ===================================================================
// カード作成関数 (写真表示ロジック + ローカルメモ機能)
// ===================================================================
function createYakinikuCard(place, map) { // 関数名を変更
    const gallery = document.getElementById('ramen-gallery'); // IDはそのまま使用
    if (!gallery) return;

    const card = document.createElement('div');
    card.className = 'ramen-card'; // CSSクラスはそのまま使用

    // ----------------------------------------------------
    // ローカルストレージから既存のメモを取得
    // ----------------------------------------------------
    const placeId = place.place_id;
    // localDataには、独自評価 (rating) とメモ (memo) が含まれる
    const localData = JSON.parse(localStorage.getItem(placeId)) || { rating: 0, memo: '' };

    // 1. 写真の処理
    if (place.photos && place.photos.length > 0) {
        const photo = place.photos[0];
        const imageUrl = photo.getUrl({ maxWidth: 400, maxHeight: 400 });

        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.alt = place.name + ' の写真';
        imageElement.style.width = '100%'; 
        imageElement.style.height = 'auto';
        imageElement.style.marginBottom = '10px';
        card.appendChild(imageElement);
    } else {
        const noPhoto = document.createElement('p');
        noPhoto.textContent = '写真はありません';
        noPhoto.style.textAlign = 'center';
        noPhoto.style.color = '#777';
        card.appendChild(noPhoto);
    }
    
    // 2. 名前, 住所, Google評価
    const name = document.createElement('h3');
    name.textContent = place.name;
    card.appendChild(name);

    const address = document.createElement('p');
    address.textContent = place.vicinity || '住所不明';
    card.appendChild(address);

    if (place.rating) {
        const rating = document.createElement('p');
        rating.innerHTML = `**Google評価**: ${place.rating} / 5.0 (${place.user_ratings_total}件)`;
        card.appendChild(rating);
    }

    // ----------------------------------------------------
    // 3. 独自評価とメモのUI (独創性はこの部分で発揮！)
    // ----------------------------------------------------
    const localRatingDiv = document.createElement('div');
    localRatingDiv.innerHTML = `**🥩 My評価**: 
        <input type="number" id="rating-${placeId}" min="1" max="5" value="${localData.rating}" style="width: 50px;"> / 5.0`;
    card.appendChild(localRatingDiv);

    const memoTextarea = document.createElement('textarea');
    memoTextarea.id = `memo-${placeId}`;
    memoTextarea.placeholder = 'ここに個人的な感想（肉質、タレ、換気など）をメモ...';
    memoTextarea.value = localData.memo;
    memoTextarea.style.width = '100%';
    memoTextarea.style.minHeight = '60px';
    memoTextarea.style.marginTop = '5px';
    card.appendChild(memoTextarea);

    const saveButton = document.createElement('button');
    saveButton.textContent = 'メモを保存';
    saveButton.style.marginTop = '5px';
    
    // ----------------------------------------------------
    // 4. 保存ロジック（イベントリスナー）
    // ----------------------------------------------------
    saveButton.addEventListener('click', () => {
        const newRating = document.getElementById(`rating-${placeId}`).value;
        const newMemo = document.getElementById(`memo-${placeId}`).value;
        
        // localStorageに保存
        localStorage.setItem(placeId, JSON.stringify({
            rating: parseFloat(newRating) || 0,
            memo: newMemo
        }));

        alert(`「${place.name}」のメモを保存しました！`);
    });
    card.appendChild(saveButton);


    // 5. 地図移動機能
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            map.setCenter(place.geometry.location);
            map.setZoom(16);
        }
    });

    gallery.appendChild(card);
}