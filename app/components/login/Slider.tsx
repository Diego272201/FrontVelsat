import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';
import '@/app/styles/slider.css';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';
import Image from 'next/image';
export default function Slider() {
  return (
    <>
      <Swiper
        spaceBetween={0}
        speed={1200}
        centeredSlides={true}
        autoplay={{
          delay: 2000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={false}
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        className="mySwiper"
        effect={'fade'}
      >
        <SwiperSlide>
          <Image src="/slider1.jpg" alt="" width={'1000'} height={'1000'} priority/>
        </SwiperSlide>
        <SwiperSlide>
          <Image src="/slider2.jpg" alt="" width={'1000'} height={'1000'} priority/>
        </SwiperSlide>
        <SwiperSlide>
          <Image src="/slider3.jpg" alt="" width={'1000'} height={'1000'} priority/>
        </SwiperSlide>
      </Swiper>
    </>
  );
}
