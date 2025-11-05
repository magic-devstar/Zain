import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // requires a loader

const ImageCarousel = ({ attachments }) => {
  if (!attachments || attachments.length === 0) {
    return <p>N/A</p>;
  }

  const arrowStyles = {
    position: 'absolute',
    zIndex: 2,
    top: 'calc(50% - 15px)',
    width: 30,
    height: 30,
    cursor: 'pointer',
    backgroundColor: 'black', // Added black background
    borderRadius: '50%', // Optional: to make it look circular
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const CustomPrevArrow = (onClickHandler, hasPrev, label) =>
    hasPrev && (
      <button type="button" onClick={onClickHandler} title={label} style={{ ...arrowStyles, left: 15 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
    );

  const CustomNextArrow = (onClickHandler, hasNext, label) =>
    hasNext && (
      <button type="button" onClick={onClickHandler} title={label} style={{ ...arrowStyles, right: 15 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
    );

  return (
    <Carousel 
      showThumbs={false} 
      infiniteLoop={true} 
      useKeyboardArrows={true} 
      showIndicators={false}
      renderArrowPrev={CustomPrevArrow}
      renderArrowNext={CustomNextArrow}
    >
      {attachments.map((attachment) => (
        <div key={attachment.id}>
          <img src={attachment.file} alt={`Inventory image ${attachment.id}`} style={{ maxHeight: '80vh', objectFit: 'contain' }} />
        </div>
      ))}
    </Carousel>
  );
};

export default ImageCarousel; 