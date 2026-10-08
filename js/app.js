const API_BASE_URL = 'https://moviesapi.ir/api/v1';


async function fetchMovies(page = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/movies?page=${page}`);
    if (!response.ok) throw new Error('خطا در دریافت اطلاعات از سرور');
    return await response.json();
  } catch (error) {
    console.error('Fetch Error:', error);
    return null;
  }
}

async function searchMovies(query, page = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/movies?q=${encodeURIComponent(query)}&page=${page}`);
    if (!response.ok) throw new Error('خطا در جستجو');
    return await response.json();
  } catch (error) {
    console.error('Search Error:', error);
    return null;
  }
}

async function fetchMovieDetails(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/movies/${id}`);
    if (!response.ok) throw new Error('فیلم یافت نشد');
    return await response.json();
  } catch (error) {
    console.error('Details Error:', error);
    return null;
  }
}

async function fetchActorImage(actorName) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(actorName)}&prop=pageimages&format=json&pithumbsize=400&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    if (pageId && pages[pageId].thumbnail) {
      return pages[pageId].thumbnail.source;
    }
  } catch (err) {
    console.error('Actor Image Error:', err);
  }
  return 'https://ui-avatars.com/api/?background=333&color=fff&size=300&name=' + encodeURIComponent(actorName);
}


async function initHeroSlider() {
  const sliderWrapper = document.getElementById('slider-wrapper');
  const dotsContainer = document.getElementById('slider-dots');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');

  if (!sliderWrapper) return;

  const response = await fetchMovies(1);

  if (!response || !response.data || response.data.length === 0) {
    sliderWrapper.innerHTML = `
      <div style="color:#aaa; padding:40px;">
        فیلمی برای نمایش پیدا نشد.
      </div>
    `;
    return;
  }

  const sliderMovies = response.data.slice(0, 5);

  const detailedMovies = await Promise.all(
    sliderMovies.map(async (movie) => {
      const details = await fetchMovieDetails(movie.id);
      return details || movie;
    })
  );

  sliderWrapper.innerHTML = detailedMovies.map((movie, index) => {
    const backdrop =
      movie.images && movie.images.length > 0
        ? movie.images[0]
        : movie.poster;

    const genres = movie.genres && movie.genres.length > 0
      ? movie.genres
      : [];

    return `
      <div class="slide ${index === 0 ? 'active' : ''}">

        <img
          src="${backdrop}"
          alt="${movie.title}"
          class="slide-backdrop"
        >

        <div class="slide-overlay">

          <div class="slide-content">

            <div class="slide-badge">
              ★ ${movie.imdb_rating || 'N/A'}
            </div>

            <h1 class="slide-title">
              ${movie.title}
            </h1>

            <div class="slide-tags">
              ${genres.map(genre => `
                <span class="tag">${genre}</span>
              `).join('')}
            </div>

            <p class="slide-description">
              ${movie.plot || 'اطلاعاتی درباره این فیلم ثبت نشده است.'}
            </p>

            <div class="slide-date">
              ${movie.year || 'N/A'}
            </div>

            <a
              href="movie-detail.html?id=${movie.id}"
              class="slide-btn"
            >
              View Info
            </a>

          </div>

        </div>

      </div>
    `;
  }).join('');

  if (dotsContainer) {
    dotsContainer.innerHTML = detailedMovies.map((_, index) => `
      <span
        class="dot ${index === 0 ? 'active' : ''}"
        data-index="${index}"
      ></span>
    `).join('');
  }

  const slides = sliderWrapper.querySelectorAll('.slide');
  const dots = dotsContainer
    ? dotsContainer.querySelectorAll('.dot')
    : [];

  let currentIndex = 0;
  let autoSlideTimer = null;

  function goToSlide(index) {
    if (!slides.length) return;

    slides[currentIndex].classList.remove('active');

    if (dots[currentIndex]) {
      dots[currentIndex].classList.remove('active');
    }

    currentIndex = (index + slides.length) % slides.length;

    slides[currentIndex].classList.add('active');

    if (dots[currentIndex]) {
      dots[currentIndex].classList.add('active');
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      goToSlide(currentIndex + 1);
      resetAutoSlide();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goToSlide(currentIndex - 1);
      resetAutoSlide();
    });
  }

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const index = Number(e.target.dataset.index);

      goToSlide(index);
      resetAutoSlide();
    });
  });

  function startAutoSlide() {
    autoSlideTimer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 5000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideTimer);
    startAutoSlide();
  }

  startAutoSlide();
}


function initImageModal() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const closeBtn = document.querySelector('.modal-close');

  if (!modal || !modalImg) return;

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('clickable-img')) {
      modalImg.src = e.target.src;
      modal.classList.add('active');
    }
  });

  const closeModal = () => modal.classList.remove('active');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === modalImg) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}


let currentSearchQuery = '';
let currentSearchPage = 1;

async function loadSearchResults(query = '', page = 1) {
  const resultsGrid = document.getElementById('results-grid');
  const resultsCount = document.getElementById('results-count');

  if (!resultsGrid) return;

  currentSearchQuery = query;
  currentSearchPage = page;

  resultsGrid.innerHTML = `<div style="color:#fff; padding:20px; grid-column: 1/-1; text-align:center;">در حال دریافت نتایج...</div>`;

  const apiPage1 = (page - 1) * 2 + 1;
  const apiPage2 = apiPage1 + 1;

  let res1, res2;
  if (query) {
    [res1, res2] = await Promise.all([
      searchMovies(query, apiPage1),
      searchMovies(query, apiPage2)
    ]);
  } else {
    [res1, res2] = await Promise.all([
      fetchMovies(apiPage1),
      fetchMovies(apiPage2)
    ]);
  }

  const movies1 = res1 && res1.data ? res1.data : [];
  const movies2 = res2 && res2.data ? res2.data : [];
  const combinedMovies = [...movies1, ...movies2];

  if (combinedMovies.length === 0) {
    resultsGrid.innerHTML = `<div style="color:#aaa; padding:40px; text-align:center; grid-column:1/-1;">هیچ فیلمی یافت نشد.</div>`;
    if (resultsCount) resultsCount.textContent = `0 titles`;
    renderSearchPagination(1, 1);
    return;
  }

  const totalApiPages = res1 && res1.metadata ? res1.metadata.page_count : 25;
  const totalGroupPages = Math.ceil(totalApiPages / 2);
  const totalCount = res1 && res1.metadata ? res1.metadata.total_count : combinedMovies.length;

  if (resultsCount) {
    resultsCount.textContent = totalCount ? `${totalCount} titles` : `${combinedMovies.length} titles`;
  }

  resultsGrid.innerHTML = combinedMovies.map(movie => `
    <div class="movie-card">
      <div class="poster-container">
        <img src="${movie.poster}" alt="${movie.title}">
      </div>
      <div class="card-body">
        <div>
          <h3 class="movie-title">${movie.title}</h3>
          <p class="movie-genre">${movie.genres ? movie.genres.join(' / ') : ''}</p>
        </div>
        <div class="card-footer">
          <div class="rating"><span class="star-icon">★</span> ${movie.imdb_rating || 'N/A'}</div>
          <a href="movie-detail.html?id=${movie.id}" class="btn-view-info" style="text-decoration:none; text-align:center;">View Info</a>
        </div>
      </div>
    </div>
  `).join('');

  renderSearchPagination(page, totalGroupPages);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSearchPagination(currentPage, totalPages) {
  const paginationNav = document.querySelector('.pagination');
  if (!paginationNav) return;

  paginationNav.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = `page-nav prev-page ${currentPage <= 1 ? 'disabled' : ''}`;
  prevBtn.type = 'button';
  prevBtn.innerHTML = '‹';
  prevBtn.onclick = () => {
    if (currentPage > 1) loadSearchResults(currentSearchQuery, currentPage - 1);
  };
  paginationNav.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-num ${i === currentPage ? 'active' : ''}`;
      pageBtn.type = 'button';
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        if (i !== currentPage) loadSearchResults(currentSearchQuery, i);
      };
      paginationNav.appendChild(pageBtn);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const dots = document.createElement('span');
      dots.className = 'dots-separator';
      dots.textContent = '...';
      paginationNav.appendChild(dots);
    }
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = `page-nav next-page ${currentPage >= totalPages ? 'disabled' : ''}`;
  nextBtn.type = 'button';
  nextBtn.innerHTML = '›';
  nextBtn.onclick = () => {
    if (currentPage < totalPages) loadSearchResults(currentSearchQuery, currentPage + 1);
  };
  paginationNav.appendChild(nextBtn);
}

document.addEventListener('DOMContentLoaded', async () => {

  initImageModal();
  initHeroSlider();

  const searchInput = document.getElementById('search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchBtn = document.getElementById('search-btn');
  const genreSelect = document.getElementById('genre-select');

  function executeSearch() {
    const query = searchInput ? searchInput.value.trim() : '';
    const selectedGenre = genreSelect ? genreSelect.value : 'all';
    
    if (selectedGenre !== 'all' && !query) {
      window.location.href = `genres.html?genre=${selectedGenre}`;
    } else {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (selectedGenre && selectedGenre !== 'all') params.append('genre', selectedGenre);
      window.location.href = `search-results.html?${params.toString()}`;
    }
  }

  if (genreSelect) genreSelect.addEventListener('change', executeSearch);
  if (searchBtn) searchBtn.addEventListener('click', executeSearch);

  if (searchInput) {
    let timeoutId;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeoutId);
      const val = e.target.value.trim();

      if (!searchDropdown) return;

      if (val.length < 2) {
        searchDropdown.classList.remove('active');
        return;
      }

      timeoutId = setTimeout(async () => {
        searchDropdown.innerHTML = `<div style="padding:10px; color:#aaa;">در حال جستجو...</div>`;
        searchDropdown.classList.add('active');

        const result = await searchMovies(val);
        
        if (!result || !result.data || result.data.length === 0) {
          searchDropdown.innerHTML = `<div style="padding:10px; color:#aaa;">نتیجه‌ای یافت نشد</div>`;
        } else {
          searchDropdown.innerHTML = result.data.slice(0, 5).map(movie => `
            <a href="movie-detail.html?id=${movie.id}" class="dropdown-item">
              <img src="${movie.images && movie.images.length > 0 ? movie.images[0] : movie.poster}" class="dropdown-poster">
              <div class="dropdown-info">
                <div class="dropdown-title">${movie.title}</div>
                <div class="dropdown-genre">${movie.year} • ${movie.genres ? movie.genres.join(', ') : ''}</div>
              </div>
            </a>
          `).join('');
        }
      }, 400);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
  }

  const moviesContainer = document.getElementById('movies-container');
  if (moviesContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentGroupPage = parseInt(urlParams.get('page')) || 1;

    moviesContainer.innerHTML = `<div style="color:#fff; padding:20px;">در حال بارگذاری فیلم‌ها...</div>`;
    
    const apiPage1 = (currentGroupPage - 1) * 2 + 1;
    const apiPage2 = apiPage1 + 1;

    const [res1, res2] = await Promise.all([
      fetchMovies(apiPage1),
      fetchMovies(apiPage2)
    ]);

    const moviesList1 = res1 && res1.data ? res1.data : [];
    const moviesList2 = res2 && res2.data ? res2.data : [];
    const combinedMovies = [...moviesList1, ...moviesList2];

    if (combinedMovies.length > 0) {
      moviesContainer.innerHTML = combinedMovies.map(movie => `
        <article class="movie-card">
          <div class="poster-container">
            <img src="${movie.poster}" alt="${movie.title}">
          </div>
          <div class="card-body">
            <div>
              <h2 class="movie-title">${movie.title}</h2>
              <p class="movie-genre">${movie.genres ? movie.genres.join(' / ') : ''}</p>
            </div>
            <div class="card-footer">
              <div class="rating"><span class="star-icon">★</span> ${movie.imdb_rating || 'N/A'}</div>
              <a href="movie-detail.html?id=${movie.id}" class="btn-view-info" style="text-decoration:none; text-align:center;">View Info</a>
            </div>
          </div>
        </article>
      `).join('');

      const paginationNav = document.querySelector('.pagination');
      if (paginationNav) {
        const totalApiPages = res1 && res1.metadata ? res1.metadata.page_count : 25;
        const totalGroupPages = Math.ceil(totalApiPages / 2);

        paginationNav.innerHTML = `
          <a href="index.html?page=${Math.max(1, currentGroupPage - 1)}" class="page-nav" style="text-decoration:none;">‹</a>
          <span class="page-num active">${currentGroupPage}</span>
          <span class="dots">of ${totalGroupPages}</span>
          <a href="index.html?page=${currentGroupPage + 1}" class="page-nav" style="text-decoration:none;">›</a>
        `;
      }
    } else {
      moviesContainer.innerHTML = `<div style="color:red; padding:20px;">خطا در دریافت اطلاعات از سرور.</div>`;
    }
  }

  const genreMoviesContainer = document.getElementById('genre-movies-container');
  if (genreMoviesContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedGenre = urlParams.get('genre') || 'Action';
    const currentPage = parseInt(urlParams.get('page')) || 1;

    const genreTitleDisplay = document.getElementById('current-genre-title');
    if (genreTitleDisplay) genreTitleDisplay.textContent = selectedGenre;

    const sidebarItems = document.querySelectorAll('#genre-sidebar-list li');
    sidebarItems.forEach(li => {
      const linkText = li.querySelector('a')?.textContent.trim();
      if (linkText && linkText.toLowerCase() === selectedGenre.toLowerCase()) {
        li.classList.add('active');
      } else {
        li.classList.remove('active');
      }
    });

    genreMoviesContainer.innerHTML = `<div style="color:#fff; padding:20px;">در حال دریافت فیلم‌های ژانر ${selectedGenre}...</div>`;

    const pagesToFetch = [1, 2, 3, 4, 5];
    const responses = await Promise.all(pagesToFetch.map(p => fetchMovies(p)));

    let allMovies = [];
    responses.forEach(res => {
      if (res && res.data) {
        allMovies = allMovies.concat(res.data);
      }
    });

    const filteredMovies = allMovies.filter(m => 
      m.genres && m.genres.some(g => g.trim().toLowerCase() === selectedGenre.trim().toLowerCase())
    );

    const titlesCount = document.getElementById('genre-titles-count');
    if (titlesCount) titlesCount.textContent = `${filteredMovies.length} titles`;

    if (filteredMovies.length === 0) {
      genreMoviesContainer.innerHTML = `
        <div style="color:#aaa; padding:40px; text-align:center;">
          هیچ فیلمی برای ژانر "${selectedGenre}" یافت نشد.
        </div>
      `;
    } else {
      const fullDetailedMovies = await Promise.all(
        filteredMovies.map(async (m) => {
          const detail = await fetchMovieDetails(m.id);
          return detail || m;
        })
      );

      genreMoviesContainer.innerHTML = fullDetailedMovies.map(movie => `
        <div class="genre-movie-card">
          <a href="movie-detail.html?id=${movie.id}" class="card-poster-link">
            <div class="card-poster">
              <img src="${movie.poster}" alt="${movie.title}">
            </div>
          </a>
          <div class="card-details">
            <div class="card-header-row">
              <h2 class="card-title">
                <a href="movie-detail.html?id=${movie.id}">${movie.title}</a>
              </h2>
              <div class="card-rating">
                <span class="star-icon">★</span>
                <span class="rating-value">${movie.imdb_rating || 'N/A'}</span>
                <span class="rating-count">(${movie.imdb_votes || 'N/A'})</span>
              </div>
            </div>

            <div class="card-meta">
              <span>${movie.year || 'N/A'}</span>
              <span class="meta-dot">•</span>
              <span>${movie.rated || 'PG-13'}</span>
              <span class="meta-dot">•</span>
              <span>${movie.runtime || 'N/A'}</span>
            </div>

            <div class="card-tags">
              ${(movie.genres || []).map(g => `<span class="tag-pill">${g}</span>`).join('')}
            </div>

            <p class="card-plot">
              ${movie.plot || 'اطلاعات خلاصه‌ای برای این فیلم ثبت نشده است.'}
            </p>

            <div class="card-credits">
              <div class="credit-row"><span class="credit-label">Director:</span> <span class="credit-value">${movie.director || 'N/A'}</span></div>
              <div class="credit-row"><span class="credit-label">Stars:</span> <span class="credit-value">${movie.actors || 'N/A'}</span></div>
              <div class="credit-row"><span class="credit-label">Votes:</span> <span class="credit-value">${movie.imdb_votes || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      `).join('');
    }

    const paginationContainer = document.getElementById('genre-pagination');
    if (paginationContainer) {
      paginationContainer.innerHTML = `
        <a href="genres.html?genre=${selectedGenre}&page=${Math.max(1, currentPage - 1)}" class="page-arrow" style="text-decoration:none; color:#fff;">&lt;</a>
        <span class="page-number">${currentPage}</span>
        <a href="genres.html?genre=${selectedGenre}&page=${currentPage + 1}" class="page-arrow" style="text-decoration:none; color:#fff;">&gt;</a>
      `;
    }
  }

  const detailMain = document.querySelector('.movie-detail-main');
  if (detailMain) {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (!movieId) {
      detailMain.innerHTML = `
        <div class="content-wrapper" style="text-align:center; padding:40px 0;">
          <h2>فیلمی انتخاب نشده است.</h2>
          <a href="index.html" style="color:#f5c518; text-decoration:none;">بازگشت به صفحه اصلی</a>
        </div>`;
      return;
    }

    detailMain.innerHTML = `<div class="content-wrapper" style="text-align:center; padding:40px 0;">در حال دریافت اطلاعات فیلم...</div>`;
    const movie = await fetchMovieDetails(movieId);

    if (movie) {
      document.title = `${movie.title} - IMDb`;

      const stills = (movie.images && movie.images.length > 0) 
        ? movie.images.slice(0, 3) 
        : [movie.poster, movie.poster, movie.poster];

      let actorNames = [];
      if (movie.actors) {
        actorNames = typeof movie.actors === 'string' 
          ? movie.actors.split(',').map(a => a.trim()).filter(a => a.length > 0)
          : movie.actors;
      }

      const finalActors = actorNames.slice(0, 6);

      const castList = await Promise.all(
        finalActors.map(async (name, index) => {
          const imgUrl = await fetchActorImage(name);
          return {
            name: name,
            role: index === 0 ? 'Lead Actor' : 'Actor',
            img: imgUrl
          };
        })
      );

      detailMain.innerHTML = `
        <div class="content-wrapper">
          <section class="movie-header-section">
            <div>
              <h1 class="movie-main-title">${movie.title}</h1>
              <div class="movie-sub-meta">
                <span>${movie.year}</span>
                <span class="meta-dot">•</span>
                <span>${movie.rated || 'PG-13'}</span>
                <span class="meta-dot">•</span>
                <span>${movie.runtime || 'N/A'}</span>
              </div>
            </div>

            <div class="rating-badge">
              <span class="star-symbol">★</span>
              <span class="score-bold">${movie.imdb_rating || 'N/A'}/10</span>
              <span class="votes-count">(${movie.imdb_votes || '0'})</span>
            </div>
          </section>

          <section class="detail-grid">
            <div class="poster-wrapper">
              <img src="${movie.poster}" alt="${movie.title}" class="main-poster-img clickable-img">
            </div>

            <div class="info-stills-wrapper">
              <div class="info-table">
                <div class="info-row">
                  <span class="info-label">Genre</span>
                  <div class="genre-pills">
                    ${(movie.genres || []).map(g => `<span class="genre-pill">${g}</span>`).join('')}
                  </div>
                </div>

                <div class="info-row">
                  <span class="info-label">Plot</span>
                  <p class="info-text">${movie.plot || 'اطلاعات خلاصه‌ای برای این فیلم ثبت نشده است.'}</p>
                </div>

                <div class="info-row">
                  <span class="info-label">Director</span>
                  <span class="info-text highlight-text">${movie.director || 'N/A'}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Writers</span>
                  <span class="info-text highlight-text">${movie.writer || 'N/A'}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Stars</span>
                  <span class="info-text highlight-text">${movie.actors || 'N/A'}</span>
                </div>
              </div>

              <div class="stills-grid">
                ${stills.map(imgUrl => `
                  <div class="still-card">
                    <img src="${imgUrl}" alt="Movie Still" class="clickable-img">
                  </div>
                `).join('')}
              </div>
            </div>
          </section>

          <section class="cast-section">
            <h2 class="section-title"><span class="title-bullet">•</span> Cast</h2>
            <div class="cast-grid">
              ${castList.map(actor => `
                <div class="cast-card">
                  <div class="cast-thumb">
                    <img src="${actor.img}" alt="${actor.name}" class="clickable-img" style="object-fit: cover; width:100%; height:100%;">
                  </div>
                  <div class="actor-name">${actor.name}</div>
                  <div class="character-name">${actor.role}</div>
                </div>
              `).join('')}
            </div>
          </section>
        </div>
      `;
    } else {
      detailMain.innerHTML = `
        <div class="content-wrapper" style="text-align:center; padding:40px 0; color:red;">
          خطا در دریافت اطلاعات فیلم از سرور.
        </div>`;
    }
  }

  const resultsGrid = document.getElementById('results-grid');
  if (resultsGrid) {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q') || '';
    const queryDisplay = document.getElementById('query-display');

    if (queryDisplay) {
      queryDisplay.textContent = searchQuery ? `"${searchQuery}"` : 'همه فیلم‌ها';
    }

    loadSearchResults(searchQuery, 1);
  }
});