import React, { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-creative';
import '@/app/styles/slider.css';

import { Autoplay, Pagination, Navigation, EffectCreative } from 'swiper/modules';

export default function Slider() {
  return (
    <>
      <Swiper
        spaceBetween={0}
        speed={2000}
        centeredSlides={true}
        autoplay={{
          delay: 2200,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={false}
        modules={[Autoplay, Pagination, Navigation, EffectCreative]}
        className="mySwiper"
        effect={'creative'}
        creativeEffect={{
          prev: {
            shadow: true,
            translate: ['-120%', 0, -500],
          },
          next: {
            shadow: true,
            translate: ['120%', 0, -500],
          },
        }}
      >
        <SwiperSlide>
          <img src="/slider1.jpg" alt="" />
        </SwiperSlide>
        <SwiperSlide>
          <img src="/slider2.jpg" alt="" />
        </SwiperSlide>
        <SwiperSlide>
          <img src="/slider3.jpg" alt="" />
        </SwiperSlide>
      </Swiper>
    </>
  );
}
