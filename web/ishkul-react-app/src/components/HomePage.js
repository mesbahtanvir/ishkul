import styled from 'styled-components';

const containerBackgroundColor = 'var(--container-background-color, #ffffff)';
const linkBackgroundColor = 'var(--link-background-color, #007bff)';
const linkHoverBackgroundColor = 'var(--link-hover-background-color, #0056b3)';
const textColor = 'var(--text-color, #333)';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: ${containerBackgroundColor};
`;

const Card = styled.div`
  background-color: ${containerBackgroundColor};
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 24px;
  color: ${textColor};
  margin-bottom: 20px;
`;

const LinkButton = styled.a`
  display: inline-block;
  padding: 10px 20px;
  background-color: ${linkBackgroundColor};
  color: #ffffff;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: ${linkHoverBackgroundColor};
  }
`;

const ServicesCard = () => {
  return (
    <Container>
      <Card>
        <Title>Our Services</Title>
        <LinkButton href="/question_bank">Question Bank</LinkButton>
      </Card>
    </Container>
  );
};

export default ServicesCard;
