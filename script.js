 //slider
(function() {
    var slides = document.querySelectorAll('.l_ads img');
    var dots = document.querySelectorAll('.slider-dot');
    var current = 0;
    var total = slides.length;
    var interval = 4000; // 4 seconds

    function showSlide(index) {
        slides.forEach(function(slide) { slide.classList.remove('active'); });
        dots.forEach(function(dot) { dot.classList.remove('active'); });
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        current = index;
    }

    function nextSlide() {
        showSlide((current + 1) % total);
    }

    // Auto-play
    var timer = setInterval(nextSlide, interval);

    // Dot click handlers
    dots.forEach(function(dot, idx) {
        dot.addEventListener('click', function() {
            clearInterval(timer);
            showSlide(idx);
            timer = setInterval(nextSlide, interval);
        });
    });
})();